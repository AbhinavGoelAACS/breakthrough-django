def check_role(user, role_to_check):
    """
    Check if a user has a specific role.
    This is extracted to avoid circular imports between view files.
    """
    if not user or not user.is_authenticated:
        return False
        
    # Admin bypass
    current_role = (getattr(user, 'role', '') or '').lower()
    if current_role == 'admin':
        return True
        
    # Standard roles to check
    roles_to_check = role_to_check if isinstance(role_to_check, list) else [role_to_check]
    roles_to_check = [r.lower() for r in roles_to_check]

    # Check primary role
    if current_role in roles_to_check:
        return True
        
    # Check UserRole table for supplemental approved roles
    try:
        from .models import UserRole
        if UserRole.objects.filter(user=user, role__in=roles_to_check, status="approved").exists():
            return True
    except Exception:
        pass
        
    return False
