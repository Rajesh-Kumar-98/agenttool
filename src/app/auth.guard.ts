import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // If there is an incoming remote signing state, allow employee to view without logging in
  if (route.queryParams['state']) {
    return true;
  }

  // Otherwise, require IT Admin logged in status
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    return true;
  }

  // Redirect unauthorized accesses to login page
  router.navigate(['/login']);
  return false;
};
