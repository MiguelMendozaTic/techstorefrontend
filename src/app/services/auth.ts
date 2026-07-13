import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: string;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  initializeAuthState(): void {
    // Verifica si hay sesión activa al iniciar la app
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    if (!token || !user) {
      this.logout();
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.usuario));
        })
      );
  }

  register(usuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, usuario);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }

  isLoggedIn(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiracion = payload.exp * 1000;

    if (Date.now() > expiracion) {
      this.logout();
      return false;
    }
    return true;
  } catch (e) {
    this.logout();
    return false;
  }
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user && user.rol === role;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }
}
