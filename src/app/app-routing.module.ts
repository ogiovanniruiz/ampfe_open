import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './authguards/auth-guard.service';

const routes: Routes = [
  {path: 'scripts', loadChildren: () => import('./components/scripts/scripts.module').then(m => m.ScriptsModule), canActivate: [AuthGuard]},
  {path: 'assets', loadChildren: () => import('./components/assets/assets.module').then(m => m.AssetsModule), canActivate: [AuthGuard]},
  {path: 'home', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), canActivate: [AuthGuard]},
  {path: 'organization', loadChildren: () => import('./components/organization/organization.module').then(m => m.OrganizationModule), canActivate: [AuthGuard]},
  {path: 'dashboard', loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule), canActivate: [AuthGuard]},
  {path: 'register', loadChildren: () => import('./components/register/register.module').then(m => m.RegisterModule)},
  {path: 'targeting', loadChildren: () => import('./components/targeting/targeting.module').then(m => m.TargetingModule), canActivate: [AuthGuard]},
  //{path: 'events', loadChildren: () => import('./components/events/events.module').then(m => m.EventsModule), canActivate: [AuthGuard]},
  {path: 'activity', loadChildren: () => import('./components/activity/activity.module').then(m => m.ActivityModule), canActivate: [AuthGuard]},
  {path: 'people', loadChildren: () => import('./components/people/people.module').then(m => m.PeopleModule), canActivate: [AuthGuard]},
  {path: 'hotline', loadChildren: () => import('./components/hotline/hotline.module').then(m => m.HotlineModule), canActivate: [AuthGuard]},
  //{path: 'canvass', loadChildren: () => import('./components/canvass/canvass.module').then(m => m.CanvassModule), canActivate: [AuthGuard]},
  {path: 'texting', loadChildren: () => import('./components/texting/texting.module').then(m => m.TextingModule), canActivate: [AuthGuard]},
  {path: 'membership', loadChildren: () => import('./components/membership/membership.module').then(m => m.MembershipModule), canActivate: [AuthGuard]},
  {path: 'phonebank', loadChildren: () => import('./components/phonebank/phonebank.module').then(m => m.PhonebankModule), canActivate: [AuthGuard]},
  {path: 'petition', loadChildren: () => import('./components/petition/petition.module').then(m => m.PetitionModule), canActivate: [AuthGuard]},
  {path: 'reports', loadChildren: () => import('./components/reports/reports.module').then(m => m.ReportsModule), canActivate: [AuthGuard]},
  {path: 'passwordreset', loadChildren: () => import('./components/passwordreset/passwordreset.module').then(m => m.PasswordresetModule)}

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
