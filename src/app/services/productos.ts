import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../interfaces/producto';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/productos';

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  getProductosActivos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/activos`);
  }

  getProductoById(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  createProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }

  updateProducto(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, producto);
  }

  deleteProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  buscarProductos(nombre: string): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/buscar`, {
      params: { nombre }
    });
  }

  getProductosBajoStock(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/bajo-stock`);
  }

  getProductosPorCategoria(categoriaId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/categoria/${categoriaId}`);
  }
  // verificar si existe un producto con el mismo nombre en la misma categoría
  verificarProductoExistente(nombre: string, categoriaId: number, productoId?: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/verificar`, {
      params: { 
        nombre, 
        categoriaId: categoriaId.toString(),
        productoId: productoId ? productoId.toString() : ''
      }
    });
  }
}