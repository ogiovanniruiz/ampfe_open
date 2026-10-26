import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './authguards/auth-guard.service';

const routes: Routes = [
  {path: 'home', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), canActivate: [AuthGuard]},
  {path: 'register', loadChildren: () => import('./components/register/register.module').then(m => m.RegisterModule)},
  {path: 'campaignMap', loadChildren: () => import('./components/campaign-map/campaignMap.module').then(m => m.CampaignMapModule), canActivate: [AuthGuard]},
  {path: 'activity', loadChildren: () => import('./components/activity/activity.module').then(m => m.ActivityModule), canActivate: [AuthGuard]},
  {path: 'people', loadChildren: () => import('./components/people/people.module').then(m => m.PeopleModule), canActivate: [AuthGuard]},
  {path: 'canvass', loadChildren: () => import('./components/canvass/canvass.module').then(m => m.CanvassModule), canActivate: [AuthGuard]},
  {path: 'texting', loadChildren: () => import('./components/texting/texting.module').then(m => m.TextingModule), canActivate: [AuthGuard]},
  {path: 'membership', loadChildren: () => import('./components/membership/membership.module').then(m => m.MembershipModule), canActivate: [AuthGuard]},
  {path: 'phonebank', loadChildren: () => import('./components/phonebank/phonebank.module').then(m => m.PhonebankModule), canActivate: [AuthGuard]},
  {path: 'passwordreset', loadChildren: () => import('./components/passwordreset/passwordreset.module').then(m => m.PasswordresetModule)},
  {path: 'swCalling', loadChildren: () => import('./components/swCalling/swCalling.module').then(m => m.SWCallingModule), canActivate: [AuthGuard]},
  {path: 'hotline', loadChildren: () => import('./components/hotline/hotline.module').then(m => m.HotlineModule), canActivate: [AuthGuard]},
  {path: 'petition', loadChildren: () => import('./components/petition/petition.module').then(m => m.PetitionModule), canActivate: [AuthGuard]},

];

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule]
})

export class AppRoutingModule { }
