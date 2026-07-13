import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from '../interfaces/categoria';

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/categorias';

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  getCategoriasActivas(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/activas`);
  }

  getCategoriaById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  createCategoria(categoria: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria);
  }

  updateCategoria(id: number, categoria: Categoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria);
  }

  deleteCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // verificar si existe una categoría con el mismo nombre
  verificarCategoriaExistente(nombre: string, categoriaId?: number): Observable<boolean> {
    let params: any = { nombre };
    
    if (categoriaId) {
      params.categoriaId = categoriaId.toString();
    }
    
    return this.http.get<boolean>(`${this.apiUrl}/verificar`, { params });
  }
}