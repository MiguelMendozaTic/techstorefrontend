import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);

  ngOnInit() {
    this.authService.initializeAuthState();
  }
}
