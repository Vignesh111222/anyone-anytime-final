import sqlite3

def clear_orders():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    
    # Delete all data from orders and order_items tables
    c.execute('DELETE FROM order_items')
    c.execute('DELETE FROM orders')
    
    conn.commit()
    conn.close()
    print("===================================================")
    print(" SUCCESS: All orders, sales, and profits cleared!")
    print(" Your products and inventory were NOT deleted.")
    print("===================================================")

if __name__ == '__main__':
    clear_orders()
