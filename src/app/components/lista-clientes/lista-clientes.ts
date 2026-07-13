import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientesService } from '../../services/clientes';
import { Cliente } from '../../interfaces/cliente';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-lista-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-clientes.html',
  styleUrls: ['./lista-clientes.css']
})
export class ListaClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  isLoading = true;
  errorMessage = '';

  // Filtros
  searchTerm = '';

  ngOnInit() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.isLoading = true;
    this.clientesService.getClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.aplicarFiltros();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando clientes:', error);
        this.errorMessage = 'Error al cargar los clientes';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let clientesFiltrados = this.clientes;

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      clientesFiltrados = clientesFiltrados.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.dni.includes(term) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(term)) ||
        (cliente.telefono && cliente.telefono.includes(term))
      );
    }

    this.clientesFiltrados = clientesFiltrados;
  }

  limpiarFiltros() {
    this.searchTerm = '';
    this.aplicarFiltros();
  }

  editarCliente(id?: number) {
    if (id) {
      this.router.navigate(['/clientes/editar', id]);
    }
  }

  eliminarCliente(id?: number) {
    if (id && confirm('¿Estás seguro de eliminar este cliente?')) {
      this.clientesService.deleteCliente(id).subscribe({
        next: () => {
          this.cargarClientes();
        },
        error: (error) => {
          console.error('Error eliminando cliente:', error);
          alert('Error al eliminar el cliente');
        }
      });
    }
  }

  reactivarCliente(id?: number) {
    if (id && confirm('¿Deseas reactivar este cliente?')) {
      this.clientesService.reactivarCliente(id).subscribe({
        next: () => {
          this.cargarClientes();
        },
        error: (error) => {
          console.error('Error reactivando cliente:', error);
          alert('Error al reactivar el cliente');
        }
      });
    }
  }

  volverAlMenu() {
    this.router.navigate(['/dashboard']);
  }

  exportarExcel(): void {
    if (this.clientesFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const datos = this.clientesFiltrados.map(cliente => ({
        'ID': cliente.id || '',
        'Nombre': cliente.nombre || '',
        'DNI': cliente.dni || '',
        'Correo': cliente.correo || 'Sin correo',
        'Teléfono': cliente.telefono || 'Sin teléfono',
        'Dirección': cliente.direccion || 'Sin dirección',
        'Fecha Registro': cliente.fechaRegistro
          ? new Date(cliente.fechaRegistro).toLocaleDateString()
          : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Reporte_Clientes_${fecha}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar a Excel');
    }
  }

  exportarPDF(): void {
    if (this.clientesFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('REPORTE DE CLIENTES', 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total de clientes: ${this.clientesFiltrados.length}`, 14, 32);

      const tableData = this.clientesFiltrados.map(cliente => [
        cliente.id?.toString() || '',
        cliente.nombre || '',
        cliente.dni || '',
        cliente.correo || 'Sin correo',
        cliente.telefono || 'Sin teléfono',
        cliente.direccion || 'Sin dirección'
      ]);

      autoTable(doc, {
        head: [['ID', 'Nombre', 'DNI', 'Correo', 'Teléfono', 'Dirección']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      const fecha = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Clientes_${fecha}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF');
    }
  }
}

