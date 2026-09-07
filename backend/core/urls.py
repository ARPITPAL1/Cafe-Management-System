from django.urls import path
from .views import (
    cafe_profile_view, 
    staff_login_view, 
    staff_list_view, 
    audit_logs_view, 
    provision_cafe_view,
    owner_master_update_view,
    owner_manage_staff_view,
    owner_reset_data_view
)

urlpatterns = [
    path('cafe/', cafe_profile_view, name='cafe_profile'),
    path('login/', staff_login_view, name='staff_login'),
    path('staff/', staff_list_view, name='staff_list'),
    path('audit-logs/', audit_logs_view, name='audit_logs'),
    path('provision/', provision_cafe_view, name='provision_cafe'),
    path('owner/master-update/', owner_master_update_view, name='owner_master_update'),
    path('owner/manage-staff/', owner_manage_staff_view, name='owner_manage_staff'),
    path('owner/reset-data/', owner_reset_data_view, name='owner_reset_data'),
]
