import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CategoriasService } from '../../services/categorias';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private categoriasService = inject(CategoriasService);
  private productosService = inject(ProductosService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: any;
  productosCount: number = 0;
  categoriasCount: number = 0;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
    }

    this.cargarConteoProductos();
    this.cargarConteoCategorias();
  }

  cargarConteoProductos() {
    this.productosService.getProductos().subscribe({
      next: (productos) => {
        this.productosCount = productos.length;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.productosCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  cargarConteoCategorias() {
    this.categoriasService.getCategorias().subscribe({
      next: (categorias) => {
        this.categoriasCount = categorias.length;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.categoriasCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }
}
