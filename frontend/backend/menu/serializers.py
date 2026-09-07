from rest_framework import serializers
from .models import Category, MenuItem, MenuItemVariant, MenuAddon, Ingredient, RecipeItem, StockAdjustmentLog

class IngredientSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    updated_display = serializers.SerializerMethodField()

    class Meta:
        model = Ingredient
        fields = '__all__'

    def get_updated_display(self, obj):
        return obj.updated_at.strftime('%d %b, %I:%M %p')

class RecipeItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    ingredient_unit = serializers.CharField(source='ingredient.unit', read_only=True)
    cost_per_unit = serializers.FloatField(source='ingredient.cost_per_unit', read_only=True)
    estimated_cost = serializers.FloatField(read_only=True)

    class Meta:
        model = RecipeItem
        fields = '__all__'

class StockAdjustmentLogSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    ingredient_unit = serializers.CharField(source='ingredient.unit', read_only=True)
    timestamp_display = serializers.SerializerMethodField()

    class Meta:
        model = StockAdjustmentLog
        fields = '__all__'

    def get_timestamp_display(self, obj):
        return obj.timestamp.strftime('%d %b, %I:%M %p')

class MenuItemVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemVariant
        fields = '__all__'

class MenuAddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuAddon
        fields = '__all__'

class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    variants = MenuItemVariantSerializer(many=True, read_only=True)
    addons = MenuAddonSerializer(many=True, read_only=True)
    recipe_items = RecipeItemSerializer(many=True, read_only=True)
    total_cost = serializers.FloatField(read_only=True)
    gross_margin = serializers.FloatField(read_only=True)
    margin_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = MenuItem
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'

    def get_items_count(self, obj):
        return obj.items.filter(is_available=True).count()
