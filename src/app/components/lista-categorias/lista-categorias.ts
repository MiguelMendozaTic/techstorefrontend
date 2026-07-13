import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CategoriasService } from '../../services/categorias';
import { Categoria } from '../../interfaces/categoria';

@Component({
  selector: 'app-lista-categorias',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-categorias.html',
  styleUrl: './lista-categorias.css'
})
export class ListaCategoriasComponent implements OnInit {
  private categoriasService = inject(CategoriasService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  categorias: Categoria[] = [];
  categoriasFiltradas: Categoria[] = [];
  isLoading = true;

  // Filtros
  searchTerm = '';
  filtroEstado = 'TODOS';

  // Estadísticas
  categoriasActivas = 0;
  categoriasInactivas = 0;

  // Opciones de filtros
  opcionesEstado = [
    { valor: 'TODOS', texto: 'Todos los estados' },
    { valor: 'ACTIVO', texto: 'Activas' },
    { valor: 'INACTIVO', texto: 'Inactivas' }
  ];

  ngOnInit() {
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.isLoading = true;
    this.categoriasService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let categoriasFiltradas = this.categorias;

    // Filtro por búsqueda
    if (this.searchTerm) {
      categoriasFiltradas = categoriasFiltradas.filter(categoria =>
        categoria.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (categoria.descripcion && categoria.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }

    // Filtro por estado
    if (this.filtroEstado !== 'TODOS') {
      categoriasFiltradas = categoriasFiltradas.filter(categoria =>
        categoria.estado === this.filtroEstado
      );
    }

    this.categoriasFiltradas = categoriasFiltradas;
    this.calcularEstadisticas();
  }

  calcularEstadisticas() {
    this.categoriasActivas = this.categoriasFiltradas.filter(c => c.estado === 'ACTIVO').length;
    this.categoriasInactivas = this.categoriasFiltradas.filter(c => c.estado === 'INACTIVO').length;
  }

  limpiarFiltros() {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.aplicarFiltros();
  }

  editarCategoria(id?: number) {
    if (id) {
      this.router.navigate(['/categorias/editar', id]);
    }
  }

  eliminarCategoria(id?: number) {
    if (id && confirm('¿Estás seguro de eliminar esta categoría?')) {
      this.categoriasService.deleteCategoria(id).subscribe({
        next: () => {
          this.cargarCategorias();
        },
        error: (error) => {
          console.error('Error eliminando categoría:', error);
          alert('Error al eliminar la categoría');
        }
      });
    }
  }

  cambiarEstado(categoria: Categoria) {
    const nuevoEstado = categoria.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const categoriaActualizada = { ...categoria, estado: nuevoEstado };

    if (categoria.id) {
      this.categoriasService.updateCategoria(categoria.id, categoriaActualizada).subscribe({
        next: () => {
          this.cargarCategorias();
        },
        error: (error) => {
          console.error('Error actualizando categoría:', error);
        }
      });
    }
  }

  getEstadoBadge(estado: string = 'ACTIVO'): string {
    return estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary';
  }

  // Método para volver al menú principal
  volverAlMenu() {
    this.router.navigate(['/dashboard']);
  }
}
