from django.db import models

class DailySalesSummary(models.Model):
    date = models.DateField(unique=True, db_index=True)
    orders_count = models.PositiveIntegerField(default=0)
    gross_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    food_cost_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    gross_margin = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cash_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    upi_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    card_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date}: Net ₹{self.net_sales}, Margin: {self.margin_percentage}%"
