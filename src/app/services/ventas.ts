import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Venta, VentaRequest, Producto } from '../interfaces/venta';
import { Cliente } from '../interfaces/cliente';

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private http = inject(HttpClient);
  private apiUrl = 'https://techstorebackend-fhbl.onrender.com/api/ventas';

  getVentas(): Observable<Venta[]> {
    console.log('Obteniendo ventas desde:', this.apiUrl); // DEBUG
    return this.http.get<Venta[]>(this.apiUrl);
  }

  getVentaById(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }

  createVenta(venta: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, venta);
  }

  cancelarVenta(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/cancelar`, {});
  }

  getVentaCompleta(id: number): Observable<Venta> {
  return this.http.get<Venta>(`${this.apiUrl}/${id}/completa`);
  }

  getVentasDelDia(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.apiUrl}/hoy`);
  }

  getVentasPorCliente(clienteId: number): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.apiUrl}/cliente/${clienteId}`);
  }

  // Métodos para obtener datos relacionados
  getProductosActivos(): Observable<Producto[]> {
    console.log('Obteniendo productos activos'); // DEBUG
    return this.http.get<Producto[]>('https://techstorebackend-fhbl.onrender.com/api/productos/activos');
  }

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>('https://techstorebackend-fhbl.onrender.com/api/clientes');
  }

  getClienteByDni(dni: string): Observable<Cliente> {
    return this.http.get<Cliente>(`https://techstorebackend-fhbl.onrender.com/api/clientes/dni/${dni}`);
  }

  getProductosPorCategoria(categoriaId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`https://techstorebackend-fhbl.onrender.com/api/productos/categoria/${categoriaId}`);
  }
}
