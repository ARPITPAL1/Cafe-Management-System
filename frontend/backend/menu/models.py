from django.db import models
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    icon = models.CharField(max_length=50, default='coffee', help_text="icon name like coffee, pizza, cake, cup-soda")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

class MenuItem(models.Model):
    SPICE_CHOICES = [
        (0, 'Not Spicy'),
        (1, 'Mild 🌶️'),
        (2, 'Medium 🌶️🌶️'),
        (3, 'Hot 🌶️🌶️🌶️'),
    ]

    name = models.CharField(max_length=120)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, help_text="Selling price")
    food_cost = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'), help_text="Ingredient cost")
    packaging_cost = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    other_cost = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    is_veg = models.BooleanField(default=True)
    spice_level = models.PositiveSmallIntegerField(choices=SPICE_CHOICES, default=0)
    prep_time_mins = models.PositiveIntegerField(default=15)
    is_available = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_special = models.BooleanField(default=False)
    image_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category__display_order', 'name']

    def __str__(self):
        return f"{self.name} (₹{self.price})"

    @property
    def total_cost(self):
        fc = Decimal(str(self.food_cost or 0))
        pc = Decimal(str(self.packaging_cost or 0))
        oc = Decimal(str(self.other_cost or 0))
        return float(fc + pc + oc)

    @property
    def gross_margin(self):
        pr = Decimal(str(self.price or 0))
        tc = Decimal(str(self.total_cost or 0))
        return float(pr - tc)

    @property
    def margin_percentage(self):
        pr = float(self.price or 0)
        if pr > 0:
            return round((float(self.gross_margin) / pr) * 100, 1)
        return 0.0

class MenuItemVariant(models.Model):
    item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=60, help_text="e.g. Regular, Large, Double Shot")
    price = models.DecimalField(max_digits=8, decimal_places=2)
    food_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.item.name} - {self.name} (₹{self.price})"

class MenuAddon(models.Model):
    item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='addons', null=True, blank=True, help_text="Blank if applies cafe-wide")
    name = models.CharField(max_length=60, help_text="e.g. Extra Cheese, Hazelnut Syrup, Oat Milk")
    price = models.DecimalField(max_digits=8, decimal_places=2)
    food_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"+ {self.name} (₹{self.price})"

class Ingredient(models.Model):
    UNIT_CHOICES = [
        ('g', 'Grams (g)'),
        ('kg', 'Kilograms (kg)'),
        ('ml', 'Milliliters (ml)'),
        ('l', 'Liters (L)'),
        ('pcs', 'Pieces (pcs)'),
        ('portions', 'Portions'),
    ]

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, default='General', help_text="e.g. Dairy, Coffee, Produce, Bakery, Packaging")
    unit = models.CharField(max_length=15, choices=UNIT_CHOICES, default='g')
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    min_alert_level = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('100.00'), help_text="Triggers low stock alert")
    cost_per_unit = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal('0.0000'), help_text="Cost per gram, ml, or piece")
    supplier = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.unit})"

    @property
    def is_low_stock(self):
        return self.current_stock <= self.min_alert_level

    @property
    def is_out_of_stock(self):
        return self.current_stock <= 0

class RecipeItem(models.Model):
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='recipe_items')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_usages')
    quantity = models.DecimalField(max_digits=8, decimal_places=2, help_text="Amount in ingredient's base unit (e.g. 18g, 220ml)")

    class Meta:
        unique_together = ['menu_item', 'ingredient']

    def __str__(self):
        return f"{self.quantity} {self.ingredient.unit} of {self.ingredient.name} for {self.menu_item.name}"

    @property
    def estimated_cost(self):
        return round(float(self.quantity) * float(self.ingredient.cost_per_unit), 2)

class StockAdjustmentLog(models.Model):
    CHANGE_TYPE_CHOICES = [
        ('RESTOCK', 'Restock / Purchase Inward'),
        ('ORDER_CONSUMED', 'Order Kitchen Consumption'),
        ('WASTAGE', 'Wastage / Spoilage'),
        ('MANUAL_CORRECTION', 'Manual Count Adjustment'),
    ]

    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='adjustments')
    change_type = models.CharField(max_length=25, choices=CHANGE_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for addition, negative for deduction")
    stock_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, help_text="e.g. Order #1002 or Invoice PO-882")
    notes = models.CharField(max_length=200, blank=True)
    performed_by = models.CharField(max_length=100, default='Manager')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.change_type} {self.quantity} {self.ingredient.unit} on {self.ingredient.name}"
