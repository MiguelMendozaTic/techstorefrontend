import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from '../interfaces/cliente';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/clientes';

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  getClienteByDni(dni: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/dni/${dni}`);
  }

  getClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  createCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente);
  }

  updateCliente(id: number, cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, cliente);
  }

  deleteCliente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  reactivarCliente(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/reactivar`, {});
  }

  buscarClientes(termino: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/buscar`, {
      params: { termino }
    });
  }
}
