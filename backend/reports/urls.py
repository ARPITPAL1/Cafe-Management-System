from django.urls import path
from .views import (
    dashboard_analytics_view,
    margin_analysis_view,
    daily_sales_report_view,
)

urlpatterns = [
    path('dashboard/', dashboard_analytics_view, name='dashboard_analytics'),
    path('margins/', margin_analysis_view, name='margin_analysis'),
    path('daily/', daily_sales_report_view, name='daily_sales_report'),
]
