import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuarioService } from '../../services/usuarios';
import { UsuarioResponse } from '../../interfaces/usuario';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-lista-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-usuarios.html',
  styleUrls: ['./lista-usuarios.css']
})
export class ListaUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private cdr = inject(ChangeDetectorRef);

  usuarios: UsuarioResponse[] = [];
  usuariosFiltrados: UsuarioResponse[] = [];
  filtroEstado: string = 'TODOS';
  filtroRol: string = 'TODOS';
  loading: boolean = false;
  error: string = '';

  estados = ['TODOS', 'ACTIVO', 'INACTIVO'];
  roles = ['TODOS', 'ADMIN', 'USER'];

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.usuarioService.getUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = 'Error al cargar los usuarios';
        this.loading = false;
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros(): void {
    this.usuariosFiltrados = this.usuarios.filter(usuario => {
      const cumpleEstado = this.filtroEstado === 'TODOS' || usuario.estado === this.filtroEstado;
      const cumpleRol = this.filtroRol === 'TODOS' || usuario.rol === this.filtroRol;
      return cumpleEstado && cumpleRol;
    });
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  eliminarUsuario(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.usuarioService.deleteUsuario(id).subscribe({
        next: () => {
          this.cargarUsuarios();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = 'Error al eliminar el usuario';
          console.error('Error:', error);
          this.cdr.detectChanges();
        }
      });
    }
  }

  cambiarEstadoUsuario(usuario: UsuarioResponse): void {
    const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const usuarioActualizado = {
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
      estado: nuevoEstado
    };

    this.usuarioService.updateUsuario(usuario.id, usuarioActualizado).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = 'Error al cambiar el estado del usuario';
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    return estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo';
  }

  getRolBadgeClass(rol: string): string {
    return rol === 'ADMIN' ? 'badge-admin' : 'badge-user';
  }

  exportarExcel(): void {
    if (this.usuariosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const datos = this.usuariosFiltrados.map(usuario => ({
        'ID': usuario.id || '',
        'Nombre': usuario.nombre || '',
        'Usuario': usuario.username || '',
        'Rol': usuario.rol || '',
        'Estado': usuario.estado || '',
        'Fecha Creación': usuario.fechaCreacion
          ? new Date(usuario.fechaCreacion).toLocaleDateString()
          : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Reporte_Usuarios_${fecha}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar a Excel');
    }
  }

  exportarPDF(): void {
    if (this.usuariosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('REPORTE DE USUARIOS', 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total de usuarios: ${this.usuariosFiltrados.length}`, 14, 32);

      const tableData = this.usuariosFiltrados.map(usuario => [
        usuario.id?.toString() || '',
        usuario.nombre || '',
        usuario.username || '',
        usuario.rol || '',
        usuario.estado || '',
        usuario.fechaCreacion
          ? new Date(usuario.fechaCreacion).toLocaleDateString()
          : ''
      ]);

      autoTable(doc, {
        head: [['ID', 'Nombre', 'Usuario', 'Rol', 'Estado', 'Fecha Creación']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      const fecha = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Usuarios_${fecha}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF');
    }
  }
}
