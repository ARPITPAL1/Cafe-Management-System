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
