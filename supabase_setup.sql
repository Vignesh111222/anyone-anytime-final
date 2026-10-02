-- Anyone Anytime - Supabase setup
-- Run this in Supabase SQL Editor AFTER your tables already exist.

-- The existing tables are kept. These functions make order placement and
-- delivery stock updates atomic, which is important when multiple customers
-- order at the same time.

create or replace function public.create_order(
    p_customer_name text,
    p_room_number text,
    p_phone text,
    p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders;
    v_item jsonb;
    v_product public.products;
    v_product_id bigint;
    v_quantity integer;
    v_price numeric(10,2);
    v_cost numeric(10,2);
    v_total numeric(10,2) := 0;
    v_profit numeric(10,2) := 0;
begin
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Order has no items';
    end if;

    -- Lock each product row while checking it.
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::bigint;
        v_quantity := (v_item->>'quantity')::integer;

        if v_quantity is null or v_quantity <= 0 then
            raise exception 'Invalid quantity';
        end if;

        select * into v_product
        from public.products
        where id = v_product_id
        for update;

        if not found then
            raise exception 'Product % not found', v_product_id;
        end if;

        if not coalesce(v_product.available, false) then
            raise exception '% is unavailable', v_product.name;
        end if;

        if coalesce(v_product.stock_quantity, 0) < v_quantity then
            raise exception 'Only % of % is available',
                coalesce(v_product.stock_quantity, 0), v_product.name;
        end if;

        v_price := coalesce(v_product.price, 0);
        v_cost := coalesce(v_product.cost_price, 0);
        v_total := v_total + (v_price * v_quantity);
        v_profit := v_profit + ((v_price - v_cost) * v_quantity);
    end loop;

    insert into public.orders (
        customer_name, room_number, phone, total_amount, total_profit, status
    )
    values (
        p_customer_name, p_room_number, p_phone,
        round(v_total, 2), round(v_profit, 2), 'received'
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::bigint;
        v_quantity := (v_item->>'quantity')::integer;

        select price into v_price
        from public.products
        where id = v_product_id;

        insert into public.order_items(order_id, product_id, quantity, price)
        values (v_order.id, v_product_id, v_quantity, v_price);
    end loop;

    return v_order;
end;
$$;


create or replace function public.update_order_status(
    p_order_id bigint,
    p_status text,
    p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders;
    v_item record;
    v_new_stock integer;
begin
    if p_status not in (
        'received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
    ) then
        raise exception 'Invalid status';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    -- Reduce stock exactly once when transitioning to delivered.
    if p_status = 'delivered' and v_order.status <> 'delivered' then
        for v_item in
            select product_id, quantity
            from public.order_items
            where order_id = p_order_id
        loop
            update public.products
            set stock_quantity = greatest(0, coalesce(stock_quantity, 0) - v_item.quantity),
                available = greatest(0, coalesce(stock_quantity, 0) - v_item.quantity) > 0
            where id = v_item.product_id;
        end loop;
    end if;

    update public.orders
    set status = p_status,
        rejection_reason = case
            when p_status = 'cancelled' then p_reason
            else null
        end
    where id = p_order_id
    returning * into v_order;

    return v_order;
end;
$$;

-- The backend uses the private Supabase key, so these functions are not
-- exposed to anonymous browser users directly.
