import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AssetAllocationComponent } from './asset-allocation/asset-allocation.component';
import { AssetReturnComponent } from './asset-return/asset-return.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'asset-allocation', component: AssetAllocationComponent, canActivate: [authGuard] },
  { path: 'asset-return', component: AssetReturnComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'home' }
];
