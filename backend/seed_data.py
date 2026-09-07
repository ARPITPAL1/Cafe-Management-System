import os
import django
import random
from decimal import Decimal
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cafe_project.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from core.models import CafeProfile, StaffProfile, AuditLog
from tables.models import Table, TableSession
from customers.models import Customer, CustomerOTP, Feedback
from menu.models import Category, MenuItem, MenuItemVariant, MenuAddon
from orders.models import Order, OrderItem, OrderStatusHistory
from billing.models import Bill, Payment
from communications.models import WhatsAppMessage

def run_seed():
    print("[SEED] Seeding database with rich demo data...")

    # 1. Cafe Profile
    cafe, _ = CafeProfile.objects.get_or_create(
        id=1,
        defaults={
            'name': 'The Velvet Bean & Bistro',
            'tagline': 'Artisan Brews, Woodfired Crusts & Gourmet Comfort',
            'address': 'Plot 42, Bandra Linking Road, Mumbai 400050',
            'phone': '+91 98201 55667',
            'email': 'hello@velvetbean.cafe',
            'gstin': '27AABCU9603R1ZN',
            'currency': '₹',
            'tax_rate_cgst': Decimal('2.5'),
            'tax_rate_sgst': Decimal('2.5'),
            'service_charge_rate': Decimal('0.0'),
            'auto_accept_orders': True,
            'whatsapp_enabled': True,
        }
    )
    print("[OK] Cafe profile ready")

    # 2. Staff Accounts
    roles = [
        ('owner', 'Arpit Sharma', 'OWNER'),
        ('manager', 'Kavita Roy', 'MANAGER'),
        ('cashier', 'Sunil Mehta', 'CASHIER'),
        ('kitchen', 'Chef Vikram', 'KITCHEN'),
    ]
    for username, name, role in roles:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': name.split()[0], 'last_name': name.split()[-1], 'email': f"{username}@velvetbean.cafe"}
        )
        user.set_password('cafe1234')
        user.save()
        StaffProfile.objects.get_or_create(
            user=user,
            defaults={'role': role, 'phone': '+91 98201 00000'}
        )
    print("[OK] Staff accounts created (owner, manager, cashier, kitchen / password: cafe1234)")

    # 3. Tables
    table_configs = [
        ("Table 01", 4, "SQUARE", "Indoor Main Hall", "tk_tbl01a"),
        ("Table 02", 2, "ROUND", "Window Lounge", "tk_tbl02b"),
        ("Table 03", 4, "SQUARE", "Indoor Main Hall", "tk_tbl03c"),
        ("Table 04", 2, "ROUND", "Outdoor Patio", "tk_tbl04d"),
        ("Table 05", 6, "RECTANGLE", "Indoor Banquette", "tk_tbl05e"),
        ("Table 06", 4, "SQUARE", "Garden Terrace", "tk_tbl06f"),
        ("Table 07", 2, "ROUND", "Balcony Vista", "tk_tbl07g"),
        ("Table 08", 8, "RECTANGLE", "Private Dining Room", "tk_tbl08h"),
        ("Table 09", 4, "SQUARE", "Garden Terrace", "tk_tbl09i"),
        ("Table 10", 4, "SQUARE", "Indoor Main Hall", "tk_tbl10j"),
        ("Table 11", 2, "ROUND", "Outdoor Patio", "tk_tbl11k"),
        ("Table 12", 4, "SQUARE", "Indoor VIP Corner", "8fJ39Kd82L"), # Blueprint token!
    ]

    created_tables = {}
    for num, cap, shape, section, token in table_configs:
        tbl, _ = Table.objects.get_or_create(
            number=num,
            defaults={
                'capacity': cap,
                'shape': shape,
                'floor_section': section,
                'public_token': token,
                'status': 'AVAILABLE'
            }
        )
        created_tables[num] = tbl
    print(f"[OK] {len(created_tables)} Tables created with distinct shapes and public tokens")

    # 4. Menu Categories
    categories_data = [
        ("Coffee & Brews", "coffee", 1),
        ("Woodfired Pizza", "pizza", 2),
        ("Burgers & Bites", "sandwich", 3),
        ("Pastas & Mains", "utensils", 4),
        ("Starters & Sides", "flame", 5),
        ("Cold Beverages", "cup-soda", 6),
        ("Desserts & Treats", "cake", 7),
    ]
    cats = {}
    for name, icon, order in categories_data:
        c, _ = Category.objects.get_or_create(
            name=name,
            defaults={'icon': icon, 'display_order': order}
        )
        cats[name] = c
    print(f"[OK] {len(cats)} Menu Categories created")

    # 5. Global Addons
    addons_data = [
        ("Extra Mozzarella Cheese", Decimal('40.00'), Decimal('12.00')),
        ("Jalapeños & Black Olives", Decimal('30.00'), Decimal('8.00')),
        ("Double Shot Espresso", Decimal('35.00'), Decimal('7.00')),
        ("Hazelnut Vanilla Syrup", Decimal('30.00'), Decimal('6.00')),
        ("Almond / Oat Milk", Decimal('45.00'), Decimal('14.00')),
        ("Peri Peri Dip", Decimal('25.00'), Decimal('5.00')),
    ]
    for name, price, cost in addons_data:
        MenuAddon.objects.get_or_create(
            name=name,
            item=None,
            defaults={'price': price, 'food_cost': cost, 'is_available': True}
        )

    # 6. Menu Items with Cost & Margin Architecture
    dishes = [
        # Coffee & Brews
        ("Artisan Cappuccino", "Coffee & Brews", "Silky double shot espresso with velvety micro-foam and cocoa dusting", Decimal('180.00'), Decimal('38.00'), Decimal('5.00'), True, 0, 10, True, True, "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600"),
        ("Cold Brew Latte", "Coffee & Brews", "Slow steeped 18-hour cold brew infused with sweetened whole milk over ice", Decimal('195.00'), Decimal('42.00'), Decimal('6.00'), True, 0, 8, True, True, "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600"),
        ("Classic Espresso", "Coffee & Brews", "Rich single origin beans with a thick golden crema", Decimal('120.00'), Decimal('22.00'), Decimal('3.00'), True, 0, 5, False, False, "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600"),
        ("Iced Caramel Macchiato", "Coffee & Brews", "Espresso layered over vanilla milk with buttery caramel drizzle", Decimal('220.00'), Decimal('48.00'), Decimal('8.00'), True, 0, 10, True, False, "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600"),
        ("Desi Masala Chai", "Coffee & Brews", "Slow brewed with crushed ginger, green cardamom and cloves", Decimal('90.00'), Decimal('16.00'), Decimal('3.00'), True, 1, 8, True, False, "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600"),

        # Pizza
        ("Paneer Tikka Pizza", "Woodfired Pizza", "Smoky tandoori paneer cubes, spiced makhani sauce, bell peppers & mozzarella", Decimal('299.00'), Decimal('110.00'), Decimal('15.00'), True, 2, 20, True, True, "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600"),
        ("Classic Margherita", "Woodfired Pizza", "San Marzano tomato coulis, fresh buffalo mozzarella, aromatic sweet basil", Decimal('249.00'), Decimal('75.00'), Decimal('12.00'), True, 0, 18, True, False, "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600"),
        ("Truffle Mushroom Pizza", "Woodfired Pizza", "Slow roasted cremini mushrooms, fontina cheese and aromatic white truffle oil", Decimal('349.00'), Decimal('125.00'), Decimal('15.00'), True, 1, 20, False, True, "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600"),
        ("Peri Peri Feast Pizza", "Woodfired Pizza", "Loaded fiery paneer, grilled corn, jalapenos and roasted garlic crust", Decimal('319.00'), Decimal('105.00'), Decimal('14.00'), True, 3, 20, True, False, "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600"),

        # Burgers & Bites
        ("Herb Grilled Paneer Burger", "Burgers & Bites", "Thick herb paneer patty with spicy chipotle aioli and crunchy lettuce on brioche", Decimal('189.00'), Decimal('58.00'), Decimal('8.00'), True, 1, 15, True, True, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"),
        ("Crispy Veg Zinger Burger", "Burgers & Bites", "Panko-crusted spiced vegetable patty, pickles and spicy mint mayonnaise", Decimal('169.00'), Decimal('46.00'), Decimal('7.00'), True, 2, 12, True, False, "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600"),
        ("Smoked Cheese Club Sandwich", "Burgers & Bites", "Triple decker toasted sandwich loaded with cheddar, roasted bell peppers & basil pesto", Decimal('199.00'), Decimal('62.00'), Decimal('9.00'), True, 1, 14, True, False, "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600"),

        # Pastas & Mains
        ("Creamy Alfredo Penne", "Pastas & Mains", "Penne tossed in garlic-parmesan cream reduction with roasted mushrooms", Decimal('269.00'), Decimal('82.00'), Decimal('10.00'), True, 0, 18, True, True, "https://images.unsplash.com/photo-1621996346565-e3adc6d6d848?w=600"),
        ("Fiery Arrabbiata Pasta", "Pastas & Mains", "Rigatoni with slow cooked crushed tomatoes, garlic flakes, bird eye chili and parsley", Decimal('239.00'), Decimal('68.00'), Decimal('9.00'), True, 3, 16, True, False, "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600"),
        ("Mysore Masala Dosa", "Pastas & Mains", "Crispy fermented golden crepe smeared with spicy red chutney and spiced potato mash", Decimal('160.00'), Decimal('35.00'), Decimal('5.00'), True, 1, 12, True, True, "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600"),

        # Starters & Sides
        ("Crispy Salted Fries", "Starters & Sides", "Hand-cut golden Idaho potatoes tossed in sea salt and rosemary", Decimal('120.00'), Decimal('28.00'), Decimal('4.00'), True, 0, 10, True, True, "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600"),
        ("Peri Peri Loaded Fries", "Starters & Sides", "Crispy fries smothered in liquid cheese sauce and fiery African peri peri dust", Decimal('160.00'), Decimal('42.00'), Decimal('6.00'), True, 2, 12, True, False, "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600"),
        ("Garlic Bread with Melted Mozzarella", "Starters & Sides", "Four toasted baguette slices rubbed with confit garlic butter and bubbling mozzarella", Decimal('159.00'), Decimal('44.00'), Decimal('5.00'), True, 0, 12, True, False, "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=600"),
        ("Paneer Tikka Platter", "Starters & Sides", "Marinated tandoori cottage cheese cubes served with mint chutney and pickled onions", Decimal('249.00'), Decimal('85.00'), Decimal('10.00'), True, 2, 15, True, True, "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600"),

        # Cold Beverages
        ("Signature Cold Coffee", "Cold Beverages", "Thick blend of rich espresso, vanilla bean gelato and dark chocolate swirls", Decimal('160.00'), Decimal('38.00'), Decimal('6.00'), True, 0, 8, True, True, "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600"),
        ("Peach Passion Iced Tea", "Cold Beverages", "Freshly brewed Darjeeling black tea with peach puree and fresh mint sprigs", Decimal('140.00'), Decimal('26.00'), Decimal('5.00'), True, 0, 6, False, False, "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600"),
        ("Fresh Mint Mojito", "Cold Beverages", "Muddled fresh mint leaves, lime wedges, sparkling soda and cane sugar", Decimal('150.00'), Decimal('28.00'), Decimal('5.00'), True, 0, 6, True, False, "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600"),

        # Desserts
        ("Sizzling Brownie with Ice Cream", "Desserts & Treats", "Dense dark chocolate walnut brownie on a smoking cast iron platter with hot fudge", Decimal('199.00'), Decimal('55.00'), Decimal('8.00'), True, 0, 10, True, True, "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600"),
        ("New York Baked Cheesecake", "Desserts & Treats", "Velvety cream cheese filling over buttery graham cracker crust with strawberry compote", Decimal('229.00'), Decimal('68.00'), Decimal('8.00'), True, 0, 5, False, True, "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600"),
        ("Belgian Nutella Waffle", "Desserts & Treats", "Crispy golden malted waffle loaded with warm Nutella and roasted hazelnut crunch", Decimal('189.00'), Decimal('52.00'), Decimal('6.00'), True, 0, 12, True, False, "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600"),
    ]

    menu_map = {}
    for name, cat_name, desc, price, food_c, pkg_c, veg, spice, prep, best, rec, img in dishes:
        item, _ = MenuItem.objects.get_or_create(
            name=name,
            defaults={
                'category': cats[cat_name],
                'description': desc,
                'price': price,
                'food_cost': food_c,
                'packaging_cost': pkg_c,
                'other_cost': Decimal('5.00'),
                'is_veg': veg,
                'spice_level': spice,
                'prep_time_mins': prep,
                'is_available': True,
                'is_bestseller': best,
                'is_recommended': rec,
                'image_url': img
            }
        )
        menu_map[name] = item
    print(f"[OK] {len(menu_map)} Gourmet Menu items created with ingredient food costs and margin metrics")

    # 7. Customers
    customers_data = [
        ("Rahul Sharma", "+919820011221", 17, Decimal('8450.00')),
        ("Priya Patel", "+919830022332", 8, Decimal('3680.00')),
        ("Vikram Malhotra", "+919840033443", 4, Decimal('1920.00')),
        ("Ananya Sen", "+919850044554", 12, Decimal('5890.00')),
        ("Rohan Verma", "+919860055665", 3, Decimal('1450.00')),
    ]
    created_custs = {}
    for name, phone, visits, spend in customers_data:
        c, _ = Customer.objects.get_or_create(
            phone=phone,
            defaults={'name': name, 'whatsapp': phone, 'total_orders': visits, 'total_spend': spend}
        )
        created_custs[phone] = c
    print(f"[OK] {len(created_custs)} Customer profiles initialized")

    # 8. Blueprint Showcase: Table 12 Active Session #5001 with Rahul Sharma & Order #1048
    t12 = created_tables["Table 12"]
    rahul = created_custs["+919820011221"]

    s12, _ = TableSession.objects.get_or_create(
        session_code="5001",
        defaults={
            'table': t12,
            'customer': rahul,
            'guest_count': 2,
            'status': 'ACTIVE',
            'opened_at': timezone.now() - timedelta(minutes=42)
        }
    )
    t12.status = 'PREPARING'
    t12.save(update_fields=['status'])

    # Blueprint Order #1048: Paneer Tikka Pizza x2, Cold Coffee x1, French Fries x1
    o1048, _ = Order.objects.get_or_create(
        order_number=1048,
        defaults={
            'session': s12,
            'customer': rahul,
            'order_source': 'QR',
            'status': 'PREPARING',
            'notes': 'No onions please on the pizza',
            'created_at': timezone.now() - timedelta(minutes=24)
        }
    )
    if not o1048.items.exists():
        # Pizza x2
        p_item = menu_map["Paneer Tikka Pizza"]
        OrderItem.objects.create(
            order=o1048,
            menu_item=p_item,
            quantity=2,
            unit_price=p_item.price,
            unit_cost=p_item.food_cost,
            addons_json=[{"name": "Extra Mozzarella Cheese", "price": 40, "cost": 12}],
            special_instructions="No onions please",
            status='PREPARING'
        )
        # Cold Coffee x1
        c_item = menu_map["Signature Cold Coffee"]
        OrderItem.objects.create(
            order=o1048,
            menu_item=c_item,
            quantity=1,
            unit_price=c_item.price,
            unit_cost=c_item.food_cost,
            addons_json=[],
            special_instructions="Extra cold",
            status='READY'
        )
        # Fries x1
        f_item = menu_map["Crispy Salted Fries"]
        OrderItem.objects.create(
            order=o1048,
            menu_item=f_item,
            quantity=1,
            unit_price=f_item.price,
            unit_cost=f_item.food_cost,
            addons_json=[],
            special_instructions="",
            status='PREPARING'
        )

        OrderStatusHistory.objects.create(
            order=o1048,
            from_status='PLACED',
            to_status='PREPARING',
            changed_by='Chef Vikram (Kitchen)',
            notes='Started preparation of pizza and fries'
        )

    # 9. Additional Active Live Tables for demo richness
    # Table 05: Rectangle 6 seats -> Priya Patel (Order #1045)
    t05 = created_tables["Table 05"]
    priya = created_custs["+919830022332"]
    s05, _ = TableSession.objects.get_or_create(
        session_code="5002",
        defaults={'table': t05, 'customer': priya, 'guest_count': 4, 'status': 'ACTIVE'}
    )
    t05.status = 'ORDERING'
    t05.save(update_fields=['status'])

    # Table 08: Bill Requested -> Vikram Malhotra
    t08 = created_tables["Table 08"]
    vikram = created_custs["+919840033443"]
    s08, _ = TableSession.objects.get_or_create(
        session_code="5003",
        defaults={'table': t08, 'customer': vikram, 'guest_count': 6, 'status': 'BILL_REQUESTED'}
    )
    t08.status = 'BILL_REQUESTED'
    t08.save(update_fields=['status'])
    o1046, _ = Order.objects.get_or_create(
        order_number=1046,
        defaults={'session': s08, 'customer': vikram, 'order_source': 'QR', 'status': 'SERVED', 'created_at': timezone.now() - timedelta(minutes=55)}
    )
    if not o1046.items.exists():
        d_item = menu_map["Truffle Mushroom Pizza"]
        OrderItem.objects.create(order=o1046, menu_item=d_item, quantity=2, unit_price=d_item.price, unit_cost=d_item.food_cost, status='SERVED')
        c_item = menu_map["Artisan Cappuccino"]
        OrderItem.objects.create(order=o1046, menu_item=c_item, quantity=3, unit_price=c_item.price, unit_cost=c_item.food_cost, status='SERVED')

    # Create bill for Table 08
    b1046, _ = Bill.objects.get_or_create(
        session=s08,
        defaults={
            'bill_number': 'INV-T08-1046',
            'subtotal': Decimal('1238.00'),
            'discount_amount': Decimal('100.00'),
            'discount_reason': 'Corporate Privilege',
            'cgst_amount': Decimal('28.45'),
            'sgst_amount': Decimal('28.45'),
            'grand_total': Decimal('1195.00'),
            'status': 'UNPAID'
        }
    )

    # 10. Completed Historical Bills for today's financial intelligence
    past_cust = created_custs["+919850044554"]
    t02 = created_tables["Table 02"]
    s02, _ = TableSession.objects.get_or_create(
        session_code="4998",
        defaults={'table': t02, 'customer': past_cust, 'guest_count': 2, 'status': 'CLOSED', 'closed_at': timezone.now() - timedelta(hours=2)}
    )
    o1042, _ = Order.objects.get_or_create(
        order_number=1042,
        defaults={'session': s02, 'customer': past_cust, 'order_source': 'QR', 'status': 'COMPLETED', 'created_at': timezone.now() - timedelta(hours=3)}
    )
    if not o1042.items.exists():
        w_item = menu_map["Sizzling Brownie with Ice Cream"]
        OrderItem.objects.create(order=o1042, menu_item=w_item, quantity=2, unit_price=w_item.price, unit_cost=w_item.food_cost, status='SERVED')
        c_item = menu_map["Signature Cold Coffee"]
        OrderItem.objects.create(order=o1042, menu_item=c_item, quantity=2, unit_price=c_item.price, unit_cost=c_item.food_cost, status='SERVED')

    b1042, _ = Bill.objects.get_or_create(
        session=s02,
        defaults={
            'bill_number': 'INV-T02-1042',
            'subtotal': Decimal('718.00'),
            'discount_amount': Decimal('0.00'),
            'cgst_amount': Decimal('17.95'),
            'sgst_amount': Decimal('17.95'),
            'grand_total': Decimal('754.00'),
            'status': 'PAID',
            'paid_at': timezone.now() - timedelta(hours=2)
        }
    )
    if not b1042.payments.exists():
        Payment.objects.create(
            bill=b1042,
            method='UPI',
            amount=Decimal('754.00'),
            reference_id='UPI-ICICI-8849201948',
            payer_name='Ananya Sen',
            status='SUCCESS'
        )

    # Feedback from Ananya
    Feedback.objects.get_or_create(
        session=s02,
        customer=past_cust,
        defaults={
            'rating_overall': 5,
            'rating_food': 5,
            'rating_service': 5,
            'rating_ambience': 5,
            'comments': "Loved the warm chocolate brownie and cold brew! Ordering from the QR was super smooth."
        }
    )

    # Audit Logs
    AuditLog.objects.create(
        user_name='Rahul Sharma',
        role='CUSTOMER',
        action='Placed QR Order',
        entity_type='Order',
        entity_id='1048',
        details='Table 12: Order #1048 submitted via QR'
    )
    AuditLog.objects.create(
        user_name='Chef Vikram',
        role='KITCHEN',
        action='Started Preparing',
        entity_type='Order',
        entity_id='1048',
        details='Order #1048 (Table 12) accepted in Kitchen'
    )

    print("\n[SUCCESS] Database seeding completed successfully!")
    print("--------------------------------------------------")
    print(f"Tables: {Table.objects.count()} | Menu: {MenuItem.objects.count()} | Customers: {Customer.objects.count()}")
    print("Table 12 is active with Order #1048 ready for live demonstration!")
    print("--------------------------------------------------\n")

if __name__ == '__main__':
    run_seed()
