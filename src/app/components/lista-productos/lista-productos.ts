import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../services/productos';
import { CategoriasService } from '../../services/categorias';
import { Producto } from '../../interfaces/producto';
import { Categoria } from '../../interfaces/categoria';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-lista-productos',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-productos.html',
  styleUrl: './lista-productos.css'
})
export class ListaProductosComponent implements OnInit {
  private productosService = inject(ProductosService);
  private categoriasService = inject(CategoriasService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[] = [];
  isLoading = true;
  isLoadingCategorias = true;

  // Filtros
  searchTerm = '';
  filtroEstado = 'TODOS';
  filtroStock = 'TODOS';
  filtroCategoria = 'TODAS';

  // Estadísticas
  productosActivos = 0;
  productosStockBajo = 0;
  productosSinStock = 0;

  // Opciones de filtros
  opcionesEstado = [
    { valor: 'TODOS', texto: 'Todos los estados' },
    { valor: 'ACTIVO', texto: 'Activos' },
    { valor: 'INACTIVO', texto: 'Inactivos' }
  ];

  opcionesStock = [
    { valor: 'TODOS', texto: 'Todo el stock' },
    { valor: 'STOCK_BAJO', texto: 'Stock bajo' },
    { valor: 'SIN_STOCK', texto: 'Sin stock' },
    { valor: 'STOCK_NORMAL', texto: 'Stock normal' }
  ];

  ngOnInit() {
    this.cargarProductos();
    this.cargarCategorias();
  }

  cargarProductos() {
    this.isLoading = true;
    this.productosService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCategorias() {
    this.isLoadingCategorias = true;
    this.categoriasService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.isLoadingCategorias = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.isLoadingCategorias = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let productosFiltrados = this.productos;

    // Filtro por búsqueda
    if (this.searchTerm) {
      productosFiltrados = productosFiltrados.filter(producto =>
        producto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }

    // Filtro por estado
    if (this.filtroEstado !== 'TODOS') {
      productosFiltrados = productosFiltrados.filter(producto =>
        producto.estado === this.filtroEstado
      );
    }

    // Filtro por stock
    if (this.filtroStock !== 'TODOS') {
      switch (this.filtroStock) {
        case 'STOCK_BAJO':
          productosFiltrados = productosFiltrados.filter(producto =>
            (producto.cantidad || 0) > 0 && (producto.cantidad || 0) <= (producto.stockMinimo || 10)
          );
          break;
        case 'SIN_STOCK':
          productosFiltrados = productosFiltrados.filter(producto =>
            (producto.cantidad || 0) === 0
          );
          break;
        case 'STOCK_NORMAL':
          productosFiltrados = productosFiltrados.filter(producto =>
            (producto.cantidad || 0) > (producto.stockMinimo || 10)
          );
          break;
      }
    }

    // Filtro por categoría
    if (this.filtroCategoria !== 'TODAS') {
      const categoriaId = Number(this.filtroCategoria);
      productosFiltrados = productosFiltrados.filter(producto =>
        producto.categoriaId === categoriaId
      );
    }

    this.productosFiltrados = productosFiltrados;
    this.calcularEstadisticas();
  }

  calcularEstadisticas() {
    this.productosActivos = this.productosFiltrados.filter(p => p.estado === 'ACTIVO').length;
    this.productosStockBajo = this.productosFiltrados.filter(p =>
      (p.cantidad || 0) > 0 && (p.cantidad || 0) <= (p.stockMinimo || 10)
    ).length;
    this.productosSinStock = this.productosFiltrados.filter(p =>
      (p.cantidad || 0) === 0
    ).length;
  }

  limpiarFiltros() {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.filtroStock = 'TODOS';
    this.filtroCategoria = 'TODAS';
    this.aplicarFiltros();
  }

  getNombreCategoria(categoriaId?: number): string {
    if (!categoriaId) return 'Sin categoría';
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Categoría no encontrada';
  }

  editarProducto(id?: number) {
    if (id) {
      this.router.navigate(['/productos/editar', id]);
    }
  }

  eliminarProducto(id?: number) {
    if (id && confirm('¿Estás seguro de eliminar este producto?')) {
      this.productosService.deleteProducto(id).subscribe({
        next: () => {
          this.cargarProductos();
        },
        error: (error) => {
          console.error('Error eliminando producto:', error);
          alert('Error al eliminar el producto');
        }
      });
    }
  }

  cambiarEstado(producto: Producto) {
    const nuevoEstado = producto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const productoActualizado = { ...producto, estado: nuevoEstado };

    if (producto.id) {
      this.productosService.updateProducto(producto.id, productoActualizado).subscribe({
        next: () => {
          this.cargarProductos();
        },
        error: (error) => {
          console.error('Error actualizando producto:', error);
        }
      });
    }
  }

  getStockStatus(cantidad: number = 0, stockMinimo: number = 10): string {
    if (cantidad === 0) return 'bg-danger';
    if (cantidad <= stockMinimo) return 'bg-warning text-dark';
    return 'bg-success';
  }

  getEstadoBadge(estado: string = 'ACTIVO'): string {
    return estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary';
  }

  calcularValorTotal(): number {
    return this.productosFiltrados.reduce((total, producto) => {
      return total + ((producto.precioCompra || 0) * (producto.cantidad || 0));
    }, 0);
  }

  // ==================== EXPORTACIÓN ====================

  exportarExcel(): void {
    if (this.productosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const datos = this.productosFiltrados.map(producto => ({
        'Producto': producto.nombre || '',
        'Descripción': producto.descripcion || 'Sin descripción',
        'Categoría': this.getNombreCategoria(producto.categoriaId),
        'Precio Compra': producto.precioCompra || 0,
        'Precio Venta': producto.precioVenta || 0,
        'Stock Actual': producto.cantidad || 0,
        'Stock Mínimo': producto.stockMinimo || 10,
        'Unidad': producto.unidad || 'UNIDAD',
        'Estado': producto.estado || '',
        'Valor Inventario': ((producto.precioCompra || 0) * (producto.cantidad || 0))
      }));

      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Stock');

      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Reporte_Stock_${fecha}.xlsx`;

      XLSX.writeFile(workbook, nombreArchivo);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar a Excel');
    }
  }

  exportarPDF(): void {
    if (this.productosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const doc = new jsPDF();

      // Título
      doc.setFontSize(16);
      doc.text('REPORTE DE STOCK DE PRODUCTOS', 105, 15, { align: 'center' });

      // Información del reporte
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total de productos: ${this.productosFiltrados.length}`, 14, 32);
      doc.text(`Productos activos: ${this.productosActivos}`, 14, 39);
      doc.text(`Productos con stock bajo: ${this.productosStockBajo}`, 14, 46);

      // Preparar datos de la tabla
      const tableData = this.productosFiltrados.map(producto => [
        producto.nombre || '',
        this.getNombreCategoria(producto.categoriaId),
        (producto.cantidad || 0).toString(),
        (producto.stockMinimo || 10).toString(),
        `S/ ${(producto.precioCompra || 0).toFixed(2)}`,
        `S/ ${(producto.precioVenta || 0).toFixed(2)}`,
        producto.estado || ''
      ]);

      // Crear tabla
      autoTable(doc, {
        head: [['Producto', 'Categoría', 'Stock', 'Stock Mín', 'P. Compra', 'P. Venta', 'Estado']],
        body: tableData,
        startY: 55,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });

      // Estadísticas al final
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Valor total del inventario: S/ ${this.calcularValorTotal().toFixed(2)}`, 14, finalY);
      doc.text(`Productos sin stock: ${this.productosSinStock}`, 14, finalY + 7);

      // Guardar PDF
      const fecha = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Stock_${fecha}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF');
    }
  }
}
