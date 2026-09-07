from rest_framework import serializers
from .models import Category, MenuItem, MenuItemVariant, MenuAddon

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
