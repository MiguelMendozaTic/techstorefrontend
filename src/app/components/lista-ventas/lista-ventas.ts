import { Component, OnInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VentasService } from '../../services/ventas';
import { Venta } from '../../interfaces/venta';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

declare var bootstrap: any;

@Component({
  selector: 'app-lista-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-ventas.html',
  styleUrl: './lista-ventas.css'
})
export class ListaVentasComponent implements OnInit {
  private ventasService = inject(VentasService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('detalleVentaModal') detalleVentaModal!: ElementRef;

  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];
  isLoading = false;
  errorMessage = '';

  ventaSeleccionada: Venta | null = null;

  // Filtros
  searchTerm = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroEstado = 'TODOS';
  filtroMetodoPago = 'TODOS';

  // Estadísticas
  ventasCompletadas = 0;
  ventasCanceladas = 0;

  // Opciones de filtros
  opcionesEstado = [
    { valor: 'TODOS', texto: 'Todos los estados' },
    { valor: 'COMPLETADA', texto: 'Completadas' },
    { valor: 'CANCELADA', texto: 'Canceladas' },
    { valor: 'PENDIENTE', texto: 'Pendientes' }
  ];

  opcionesMetodoPago = [
    { valor: 'TODOS', texto: 'Todos los métodos' },
    { valor: 'EFECTIVO', texto: 'Efectivo' },
    { valor: 'TARJETA', texto: 'Tarjeta' },
    { valor: 'PLIN', texto: 'Plin' },
    { valor: 'YAPE', texto: 'Yape' },
    { valor: 'TRANSFERENCIA', texto: 'Transferencia' }
  ];

  ngOnInit() {
    this.establecerRangoFechasPorDefecto();
    this.cargarVentas();
  }

  establecerRangoFechasPorDefecto() {
    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaHasta.getDate() - 7); // Últimos 7 días

    this.filtroFechaHasta = this.formatearFecha(fechaHasta);
    this.filtroFechaDesde = this.formatearFecha(fechaDesde);
  }

  formatearFecha(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  cargarVentas() {
    this.isLoading = true;
    this.ventasService.getVentas().subscribe({
      next: (ventas) => {
        console.log('Ventas cargadas:', ventas);
        this.ventas = ventas.sort((a, b) => (b.id || 0) - (a.id || 0));
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando ventas:', error);
        this.errorMessage = 'Error al cargar las ventas: ' + error.message;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  validarFechas(): boolean {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      const fechaDesde = new Date(this.filtroFechaDesde);
      const fechaHasta = new Date(this.filtroFechaHasta);

      if (fechaHasta < fechaDesde) {
        alert('La fecha "Hasta" no puede ser menor que la fecha "Desde"');
        this.filtroFechaHasta = this.filtroFechaDesde;
        return false;
      }
    }
    return true;
  }

  aplicarFiltros() {
    if (!this.validarFechas()) {
      return;
    }

    let ventasFiltradas = this.ventas;

    // Filtro por búsqueda general
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      ventasFiltradas = ventasFiltradas.filter(venta =>
        venta.id?.toString().includes(term) ||
        venta.clienteId?.toString().includes(term) ||
        venta.cliente?.nombre?.toLowerCase().includes(term) ||
        venta.cliente?.dni?.includes(term) ||
        venta.usuario?.nombre?.toLowerCase().includes(term) ||
        venta.usuario?.username?.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (this.filtroEstado !== 'TODOS') {
      ventasFiltradas = ventasFiltradas.filter(venta =>
        venta.estado === this.filtroEstado
      );
    }

    // Filtro por método de pago
    if (this.filtroMetodoPago !== 'TODOS') {
      ventasFiltradas = ventasFiltradas.filter(venta =>
        venta.tipoPago?.toUpperCase() === this.filtroMetodoPago
      );
    }

    // Filtro por fecha desde
    if (this.filtroFechaDesde) {
      const fechaDesde = new Date(this.filtroFechaDesde);
      const fechaDesdeUTC = new Date(fechaDesde);
      fechaDesdeUTC.setUTCHours(5, 0, 0, 0);

      ventasFiltradas = ventasFiltradas.filter(venta => {
        if (!venta.fecha) return false;
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta >= fechaDesdeUTC;
      });
    }

    // Filtro por fecha hasta
    if (this.filtroFechaHasta) {
      const fechaHasta = new Date(this.filtroFechaHasta);
      const fechaHastaUTC = new Date(fechaHasta);
      fechaHastaUTC.setUTCDate(fechaHastaUTC.getUTCDate() + 1);
      fechaHastaUTC.setUTCHours(4, 59, 59, 999);

      ventasFiltradas = ventasFiltradas.filter(venta => {
        if (!venta.fecha) return false;
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta <= fechaHastaUTC;
      });
    }

    this.ventasFiltradas = ventasFiltradas;
    this.calcularEstadisticas();
  }

  onFechaDesdeChange() {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      const fechaDesde = new Date(this.filtroFechaDesde);
      const fechaHasta = new Date(this.filtroFechaHasta);

      if (fechaHasta < fechaDesde) {
        this.filtroFechaHasta = this.filtroFechaDesde;
      }
    }
    this.aplicarFiltros();
  }

  onFechaHastaChange() {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      const fechaDesde = new Date(this.filtroFechaDesde);
      const fechaHasta = new Date(this.filtroFechaHasta);

      if (fechaHasta < fechaDesde) {
        alert('La fecha "Hasta" no puede ser menor que la fecha "Desde"');
        this.filtroFechaHasta = this.filtroFechaDesde;
        return;
      }
    }
    this.aplicarFiltros();
  }

  calcularEstadisticas() {
    this.ventasCompletadas = this.ventasFiltradas.filter(v => v.estado === 'COMPLETADA').length;
    this.ventasCanceladas = this.ventasFiltradas.filter(v => v.estado === 'CANCELADA').length;
  }

  limpiarFiltros() {
    this.searchTerm = '';
    this.establecerRangoFechasPorDefecto();
    this.filtroEstado = 'TODOS';
    this.filtroMetodoPago = 'TODOS';
    this.aplicarFiltros();
  }

  verDetalle(venta: Venta) {
  this.ventasService.getVentaById(venta.id!).subscribe({
    next: (ventaCompleta) => {
      console.log('Venta completa:', JSON.stringify(ventaCompleta));
      this.ventaSeleccionada = ventaCompleta;
      this.cdr.detectChanges();
      const modalElement = this.detalleVentaModal.nativeElement;
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    },
    error: (error) => {
      console.error('Error cargando detalle:', error);
      this.ventaSeleccionada = venta;
      this.cdr.detectChanges();
      const modalElement = this.detalleVentaModal.nativeElement;
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  });
}

  cancelarDesdeModal() {
    if (this.ventaSeleccionada?.id) {
      this.cancelarVenta(this.ventaSeleccionada.id);
    }
  }

  cancelarVenta(id: number) {
    if (confirm('¿Está seguro de que desea cancelar esta venta?')) {
      this.ventasService.cancelarVenta(id).subscribe({
        next: () => {
          this.cargarVentas();
          this.cdr.detectChanges();
          const modalElement = this.detalleVentaModal.nativeElement;
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) {
            modal.hide();
          }
        },
        error: (error) => {
          console.error('Error cancelando venta:', error);
          alert('Error al cancelar la venta: ' + error.message);
        }
      });
    }
  }

  getBadgeClass(estado: string): string {
    switch (estado) {
      case 'COMPLETADA': return 'badge bg-success';
      case 'CANCELADA': return 'badge bg-danger';
      case 'PENDIENTE': return 'badge bg-warning text-dark';
      default: return 'badge bg-secondary';
    }
  }

  getPagoBadgeClass(tipoPago: string): string {
    const pago = tipoPago?.toUpperCase();
    switch (pago) {
      case 'EFECTIVO': return 'bg-warning text-dark';
      case 'TARJETA': return 'bg-primary text-white';
      case 'PLIN': return 'bg-success text-white';
      case 'YAPE': return 'bg-purple text-white';
      case 'TRANSFERENCIA': return 'bg-info text-dark';
      default: return 'bg-secondary text-white';
    }
  }

  calcularTotalGeneral(): number {
    return this.ventasFiltradas.reduce((total, venta) => {
      return total + (venta.total || 0);
    }, 0);
  }

  volverAlMenu() {
    this.router.navigate(['/dashboard']);
  }

  // Exportar a Excel

  exportarExcel(): void {
    if (this.ventasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const datos = this.ventasFiltradas.map(venta => ({
        'ID Venta': venta.id || '',
        'Fecha': venta.fecha ? new Date(venta.fecha).toLocaleDateString() : '',
        'Hora': venta.fecha ? new Date(venta.fecha).toLocaleTimeString() : '',
        'Cliente': venta.cliente?.nombre || 'N/A',
        'DNI Cliente': venta.cliente?.dni || 'N/A',
        'Vendedor': venta.usuario?.nombre || 'N/A',
        'Total': venta.total || 0,
        'Subtotal': venta.subtotal || 0,
        'IGV': venta.igv || 0,
        'Método Pago': venta.tipoPago || 'N/A',
        'Estado': venta.estado || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Ventas');

      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Reporte_Ventas_${fecha}.xlsx`;

      XLSX.writeFile(workbook, nombreArchivo);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar a Excel');
    }
  }

  exportarPDF(): void {
    if (this.ventasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const doc = new jsPDF();

      // Título
      doc.setFontSize(16);
      doc.text('REPORTE DE VENTAS', 105, 15, { align: 'center' });

      // Información del reporte
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total de ventas: ${this.ventasFiltradas.length}`, 14, 32);
      doc.text(`Período: ${this.filtroFechaDesde} al ${this.filtroFechaHasta}`, 14, 39);

      // Preparar datos de la tabla
      const tableData = this.ventasFiltradas.map(venta => [
        venta.id?.toString() || '',
        venta.fecha ? new Date(venta.fecha).toLocaleDateString() : '',
        venta.cliente?.nombre || 'N/A',
        venta.cliente?.dni || 'N/A',
        `S/ ${(venta.total || 0).toFixed(2)}`,
        venta.tipoPago || 'N/A',
        venta.estado || 'N/A'
      ]);

      // Crear tabla
      autoTable(doc, {
        head: [['ID', 'Fecha', 'Cliente', 'DNI', 'Total', 'Pago', 'Estado']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Estadísticas al final
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Ventas Completadas: ${this.ventasCompletadas}`, 14, finalY);
      doc.text(`Ventas Canceladas: ${this.ventasCanceladas}`, 14, finalY + 7);
      doc.text(`Total General: S/ ${this.calcularTotalGeneral().toFixed(2)}`, 14, finalY + 14);

      // Guardar PDF
      const fecha = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Ventas_${fecha}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF');
    }
  }
}
