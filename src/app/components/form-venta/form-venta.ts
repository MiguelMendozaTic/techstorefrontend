import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormControl, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas';
import { CategoriasService } from '../../services/categorias';
import { ClientesService } from '../../services/clientes';
import { AuthService } from '../../services/auth';
import { VentaRequest, DetalleVentaRequest, Producto } from '../../interfaces/venta';
import { Cliente } from '../../interfaces/cliente';
import { Categoria } from '../../interfaces/categoria';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { GoogleDriveService } from '../../services/google-drive';

@Component({
  selector: 'app-form-venta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './form-venta.html',
  styleUrl: './form-venta.css'
})
export class FormVentaComponent implements OnInit {
  private ventasService = inject(VentasService);
  private categoriasService = inject(CategoriasService);
  private clientesService = inject(ClientesService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private googleDriveService = inject(GoogleDriveService);

  ventaForm: FormGroup;
  isLoading = false;
  isBuscandoCliente = false;
  errorMessage = '';
  successMessage = '';
  mostrarFormCliente = false;
  clienteExistente: Cliente | null = null;

  showToast = false;
  ventaTotalToast = 0;
  toastMessage = '';

  // ── NUEVO: mensaje de estado de la boleta ─────────────────
  mensajeDescarga = '';

  categorias: Categoria[] = [];
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  tiposPago = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

  dniBusqueda: string = '';
  productosSeleccionados: Map<number, number> = new Map();
  metodoPagoSeleccionado: string = 'EFECTIVO';
  categoriaPorDefectoId: number = 4;

  constructor() {
    this.ventaForm = this.fb.group({
      clienteNombre: ['', [Validators.required, Validators.maxLength(100)]],
      clienteDni: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      clienteCorreo: ['', [Validators.email, Validators.maxLength(100)]],
      clienteTelefono: ['', [Validators.minLength(9), Validators.maxLength(9), Validators.pattern('^[0-9]*$')]],
      clienteDireccion: ['', Validators.required],
      tipoPago: ['EFECTIVO', Validators.required],
      detalles: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.cargarDatosIniciales();
    this.ventaForm.patchValue({ tipoPago: 'EFECTIVO' });
    this.metodoPagoSeleccionado = 'EFECTIVO';
  }

  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  cargarDatosIniciales() {
    this.isLoading = true;

    this.categoriasService.getCategoriasActivas().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        this.aplicarFiltroCategoriaPorDefecto();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.errorMessage = 'Error al cargar las categorías';
        this.cdr.detectChanges();
      }
    });

    this.ventasService.getProductosActivos().subscribe({
      next: (productos) => {
        this.productos = productos;
        this.aplicarFiltroCategoriaPorDefecto();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.errorMessage = 'Error al cargar los productos';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltroCategoriaPorDefecto() {
    if (this.productos.length > 0) {
      this.productosFiltrados = this.productos.filter(p => p.categoriaId === this.categoriaPorDefectoId);
    }
  }

  getUsuarioAutenticado(): any {
    return this.authService.getCurrentUser();
  }

  getUsuarioId(): number {
    const usuario = this.getUsuarioAutenticado();
    return usuario?.id || 0;
  }

  buscarCliente() {
    if (!this.dniBusqueda || this.dniBusqueda.length !== 8) {
      this.errorMessage = 'Ingrese un DNI válido de 8 dígitos';
      return;
    }

    this.isBuscandoCliente = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.clientesService.getClienteByDni(this.dniBusqueda).subscribe({
      next: (cliente) => {
        this.isBuscandoCliente = false;
        this.clienteExistente = cliente;
        this.mostrarFormCliente = false;

        this.ventaForm.patchValue({
          clienteNombre: cliente.nombre,
          clienteDni: cliente.dni,
          clienteCorreo: cliente.correo || '',
          clienteTelefono: cliente.telefono || '',
          clienteDireccion: cliente.direccion || ''
        });

        this.successMessage = `Cliente encontrado: ${cliente.nombre}`;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isBuscandoCliente = false;

        if (error.status === 404) {
          this.clienteExistente = null;
          this.mostrarFormCliente = true;

          this.ventaForm.patchValue({
            clienteDni: this.dniBusqueda,
            clienteNombre: '',
            clienteCorreo: '',
            clienteTelefono: '',
            clienteDireccion: ''
          });

          this.successMessage = 'Cliente no encontrado. Complete los datos para registrarlo.';
        } else {
          this.errorMessage = 'Error al buscar cliente';
        }
        this.cdr.detectChanges();
      }
    });
  }

  limpiarBusquedaCliente() {
    this.dniBusqueda = '';
    this.clienteExistente = null;
    this.mostrarFormCliente = false;
    this.errorMessage = '';
    this.successMessage = '';

    this.ventaForm.patchValue({
      clienteNombre: '',
      clienteDni: '',
      clienteCorreo: '',
      clienteTelefono: '',
      clienteDireccion: '',
      tipoPago: 'EFECTIVO'
    });
    this.metodoPagoSeleccionado = 'EFECTIVO';
  }

  actualizarMetodoPago(event: any) {
    const nuevoMetodo = event.target.value;
    this.metodoPagoSeleccionado = nuevoMetodo;
    this.ventaForm.patchValue({ tipoPago: nuevoMetodo });
  }

  // ── TOAST: aparece y desaparece en 3 segundos ─────────────
  mostrarToastExitoso(total: number) {
    this.ventaTotalToast = total;
    this.toastMessage = `¡Venta Exitosa! Total: S/. ${total.toFixed(2)}`;
    this.showToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showToast = false;
      this.ventaTotalToast = 0;
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  cerrarToast() {
    this.showToast = false;
    this.ventaTotalToast = 0;
    this.toastMessage = '';
    this.cdr.detectChanges();
  }

  getCategoriaNombre(categoriaId: number): string {
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  filtrarProductosPorCategoria(event: any) {
    const categoriaId = event.target.value;
    this.productosFiltrados = categoriaId
      ? this.productos.filter(p => p.categoriaId === +categoriaId)
      : this.productos;
  }

  filtrarProductosPorNombre(event: any) {
    const termino = event.target.value.toLowerCase();
    if (termino) {
      this.productosFiltrados = this.productos.filter(p =>
        p.nombre.toLowerCase().includes(termino)
      );
    } else {
      this.aplicarFiltroCategoriaPorDefecto();
    }
  }

  getCantidadSeleccionada(productoId: number): number {
    return this.productosSeleccionados.get(productoId) || 0;
  }

  incrementarCantidad(producto: Producto) {
    const current = this.getCantidadSeleccionada(producto.id);
    if (current < producto.cantidad) {
      this.productosSeleccionados.set(producto.id, current + 1);
    }
  }

  decrementarCantidad(producto: Producto) {
    const current = this.getCantidadSeleccionada(producto.id);
    if (current > 0) {
      this.productosSeleccionados.set(producto.id, current - 1);
    }
  }

  actualizarCantidad(producto: Producto, event: any) {
    const cantidad = parseInt(event.target.value) || 0;
    if (cantidad >= 0 && cantidad <= producto.cantidad) {
      this.productosSeleccionados.set(producto.id, cantidad);
    } else if (cantidad > producto.cantidad) {
      this.productosSeleccionados.set(producto.id, producto.cantidad);
      event.target.value = producto.cantidad;
    }
  }

  agregarProductoAlCarrito(producto: Producto) {
    const cantidad = this.getCantidadSeleccionada(producto.id);
    if (cantidad > 0 && cantidad <= producto.cantidad) {
      const existingIndex = this.detalles.controls.findIndex(
        detalle => detalle.get('productoId')?.value === producto.id
      );

      if (existingIndex >= 0) {
        const detalle = this.detalles.at(existingIndex);
        const nuevaCantidad = detalle.get('cantidad')?.value + cantidad;

        if (nuevaCantidad <= producto.cantidad) {
          detalle.patchValue({ cantidad: nuevaCantidad });
          this.calcularSubtotal(detalle as FormGroup);
        } else {
          this.errorMessage = `No hay suficiente stock. Stock disponible: ${producto.cantidad}`;
          return;
        }
      } else {
        const detalleForm = this.fb.group({
          productoId: [producto.id, Validators.required],
          cantidad: [cantidad, [Validators.required, Validators.min(1)]],
          precioUnitario: [producto.precioVenta, [Validators.required, Validators.min(0.01)]],
          subtotal: [{ value: cantidad * producto.precioVenta, disabled: true }]
        });
        this.detalles.push(detalleForm);
      }

      this.productosSeleccionados.set(producto.id, 0);
      this.errorMessage = '';
    }
  }

  calcularSubtotal(detalleForm: FormGroup) {
    const cantidad = detalleForm.get('cantidad')?.value || 0;
    const precio = detalleForm.get('precioUnitario')?.value || 0;
    detalleForm.patchValue({ subtotal: cantidad * precio }, { emitEvent: false });
  }

  eliminarDetalle(index: number) {
    this.detalles.removeAt(index);
  }

  getTotalVenta(): number {
    return this.detalles.controls.reduce((total, detalle) => {
      return total + (detalle.get('subtotal')?.value || 0);
    }, 0);
  }

  getSubtotalSinIgv(): number {
    return this.getTotalVenta() / 1.18;
  }

  getIGV(): number {
    const total = this.getTotalVenta();
    return total - total / 1.18;
  }

  getTotalConIGV(): number {
    return this.getTotalVenta();
  }

  getProductoNombre(productoId: any): string {
    if (!productoId) return 'Seleccione un producto';
    const producto = this.productos.find(p => p.id === +productoId);
    return producto ? producto.nombre : 'Producto no encontrado';
  }

  getStockProducto(productoId: any): number {
    if (!productoId) return 0;
    const producto = this.productos.find(p => p.id === +productoId);
    return producto?.cantidad || 0;
  }

  validarStock(): boolean {
    for (let i = 0; i < this.detalles.length; i++) {
      const detalle = this.detalles.at(i);
      const productoId = detalle.get('productoId')?.value;
      const cantidad = detalle.get('cantidad')?.value;

      if (productoId && cantidad) {
        const stock = this.getStockProducto(productoId);
        if (cantidad > stock) {
          this.errorMessage = `Stock insuficiente para ${this.getProductoNombre(productoId)}. Stock disponible: ${stock}`;
          return false;
        }
      }
    }
    return true;
  }

  tieneDetallesCompletos(): boolean {
    if (this.detalles.length === 0) return false;
    return this.detalles.controls.every(detalle => {
      const productoId = detalle.get('productoId')?.value;
      const cantidad = detalle.get('cantidad')?.value;
      const precio = detalle.get('precioUnitario')?.value;
      return productoId && cantidad > 0 && precio > 0 && detalle.valid;
    });
  }

  esFormularioValido(): boolean {
    const clienteValido = this.clienteExistente || this.mostrarFormCliente;
    return this.ventaForm.valid && this.tieneDetallesCompletos() && !!clienteValido && this.validarStock();
  }

  async onSubmit() {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'Debe estar autenticado para realizar una venta';
      return;
    }

    const usuarioId = this.getUsuarioId();
    if (!usuarioId) {
      this.errorMessage = 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.';
      return;
    }

    if (!this.clienteExistente && !this.mostrarFormCliente) {
      this.errorMessage = 'Primero busque o registre un cliente';
      return;
    }

    if (this.detalles.length === 0) {
      this.errorMessage = 'Agregue al menos un producto a la venta';
      return;
    }

    if (!this.tieneDetallesCompletos()) {
      this.errorMessage = 'Complete todos los productos correctamente';
      this.marcarCamposComoTouched();
      return;
    }

    if (!this.validarStock()) return;

    if (this.mostrarFormCliente) {
      const nombre = this.ventaForm.get('clienteNombre')?.value;
      const dni = this.ventaForm.get('clienteDni')?.value;
      const correo = this.ventaForm.get('clienteCorreo')?.value;
      const telefono = this.ventaForm.get('clienteTelefono')?.value;
      const direccion = this.ventaForm.get('clienteDireccion')?.value;

      if (!nombre?.trim()) { this.errorMessage = 'El nombre del cliente es requerido'; return; }
      if (nombre.length > 100) { this.errorMessage = 'El nombre no puede exceder 100 caracteres'; return; }
      if (!dni || dni.length !== 8) { this.errorMessage = 'El DNI debe tener exactamente 8 dígitos'; return; }
      if (correo && correo.length > 100) { this.errorMessage = 'El correo no puede exceder 100 caracteres'; return; }
      if (telefono && telefono.length > 9) { this.errorMessage = 'El teléfono no puede exceder 9 dígitos'; return; }
      if (direccion && direccion.length > 150) { this.errorMessage = 'La dirección no puede exceder 150 caracteres'; return; }
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      let clienteId: number;

      if (this.clienteExistente) {
        clienteId = this.clienteExistente.id!;
      } else {
        const nuevoCliente: Cliente = {
          nombre: this.ventaForm.get('clienteNombre')?.value.trim(),
          dni: this.ventaForm.get('clienteDni')?.value,
          correo: this.ventaForm.get('clienteCorreo')?.value?.trim() || undefined,
          telefono: this.ventaForm.get('clienteTelefono')?.value?.trim() || undefined,
          direccion: this.ventaForm.get('clienteDireccion')?.value?.trim() || undefined
        };

        const clienteCreado = await this.clientesService.createCliente(nuevoCliente).toPromise();
        if (!clienteCreado?.id) throw new Error('Error al crear el cliente');
        clienteId = clienteCreado.id;
      }

      const ventaData: VentaRequest = {
        clienteId,
        usuarioId,
        tipoPago: this.ventaForm.get('tipoPago')?.value,
        detalles: this.detalles.controls.map(detalle => ({
          productoId: detalle.get('productoId')?.value,
          cantidad: detalle.get('cantidad')?.value,
          precioUnitario: detalle.get('precioUnitario')?.value
        }))
      };

      this.ventasService.createVenta(ventaData).subscribe({
        next: (ventaCreada) => {
          this.isLoading = false;

          // 1. Toast aparece y desaparece solo en 3 segundos
          this.mostrarToastExitoso(ventaCreada.total);

          // 2. Limpiar formulario inmediatamente
          this.limpiarFormulario();
          this.cargarProductos();

          // 3. Generar boleta y subir a Drive en paralelo (no bloquea el toast)
          setTimeout(() => {
            this.mensajeDescarga = '📄 Generando boleta y subiendo a Drive...';
            this.cdr.detectChanges();

            this.generarBoletaPDF(ventaCreada)
              .then(() => {
                this.mensajeDescarga = 'Boleta guardada en Drive y descargada';
                this.cdr.detectChanges();
                setTimeout(() => {
                  this.mensajeDescarga = '';
                  this.cdr.detectChanges();
                }, 4000);
              })
              .catch(err => {
                console.error('Error generando boleta:', err);
                this.mensajeDescarga = 'Boleta descargada (sin Drive)';
                this.cdr.detectChanges();
                setTimeout(() => {
                  this.mensajeDescarga = '';
                  this.cdr.detectChanges();
                }, 4000);
              });
          }, 500);
        },
        error: (error) => {
          console.error('Error creando venta:', error);

          if (error.error?.error) {
            const msg = error.error.error;
            if (msg.includes('Stock insuficiente')) this.errorMessage = msg;
            else if (msg.includes('Ya existe un cliente')) this.errorMessage = msg + '. Por favor, busque el cliente existente.';
            else this.errorMessage = msg;
          } else {
            this.errorMessage = 'Error al crear la venta. Verifique los datos e intente nuevamente.';
          }

          this.isLoading = false;
        }
      });

    } catch (error: any) {
      console.error('Error procesando venta:', error);
      this.errorMessage = error.message || 'Error al procesar la venta';
      this.isLoading = false;
    }
  }

  limpiarFormulario() {
    this.detalles.clear();
    this.productosSeleccionados.clear();
    this.limpiarBusquedaCliente();
    this.metodoPagoSeleccionado = 'EFECTIVO';
    this.ventaForm.patchValue({ tipoPago: 'EFECTIVO' });
    this.aplicarFiltroCategoriaPorDefecto();
  }

  cargarProductos() {
    this.ventasService.getProductosActivos().subscribe({
      next: (productos) => {
        this.productos = productos;
        this.aplicarFiltroCategoriaPorDefecto();
      },
      error: (error) => console.error('Error recargando productos:', error)
    });
  }

  marcarCamposComoTouched() {
    this.ventaForm.markAllAsTouched();
    this.detalles.controls.forEach(d => d.markAsTouched());
  }

  getClienteNombre(): string {
    return this.ventaForm.get('clienteNombre')?.value || 'No especificado';
  }

  getClienteDni(): string {
    return this.ventaForm.get('clienteDni')?.value || 'No especificado';
  }

  get tipoPago(): AbstractControl | null { return this.ventaForm.get('tipoPago'); }
  get clienteNombre(): AbstractControl | null { return this.ventaForm.get('clienteNombre'); }
  get clienteDni(): AbstractControl | null { return this.ventaForm.get('clienteDni'); }
  get clienteTelefono(): AbstractControl | null { return this.ventaForm.get('clienteTelefono'); }
  get clienteCorreo(): AbstractControl | null { return this.ventaForm.get('clienteCorreo'); }
  get clienteDireccion(): AbstractControl | null { return this.ventaForm.get('clienteDireccion'); }

  irAlMenuPrincipal() {
    this.router.navigate(['/dashboard']);
  }

  // ── GENERAR BOLETA PDF + SUBIR A DRIVE ───────────────────
  async generarBoletaPDF(venta: any): Promise<void> {
    const doc = new jsPDF();
    const nombreArchivo = `Boleta_B001-${String(venta.id).padStart(6, '0')}.pdf`;

    // ── PASO 1: Construir el PDF COMPLETO ────────────────────

    // CABECERA
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHSTORE', 105, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Tienda de Tecnología', 105, 25, { align: 'center' });
    doc.text('Jr. 28 de Julio 1023, La Victoria - Lima', 105, 31, { align: 'center' });
    doc.text('RUC: 20123456789  |  Tel: 987-654-321', 105, 37, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // TÍTULO
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLETA DE VENTA ELECTRÓNICA', 105, 50, { align: 'center' });

    // DATOS BOLETA
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° Boleta: B001-${String(venta.id).padStart(6, '0')}`, 14, 58);
    doc.text(`Fecha: ${new Date(venta.fecha).toLocaleDateString('es-PE')}`, 14, 64);
    doc.text(`Hora:  ${new Date(venta.fecha).toLocaleTimeString('es-PE')}`, 14, 70);
    doc.text(`Método de Pago: ${venta.tipoPago}`, 14, 76);

    // DATOS DEL CLIENTE
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 14, 86);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre : ${venta.cliente?.nombre || 'N/A'}`, 14, 92);
    doc.text(`DNI    : ${venta.cliente?.dni || 'N/A'}`, 14, 98);

    // TABLA DE PRODUCTOS
    const filas = (venta.detalles || []).map((d: any, i: number) => [
      i + 1,
      d.producto?.nombre || 'Producto',
      d.cantidad,
      `S/ ${Number(d.precioUnitario).toFixed(2)}`,
      `S/ ${Number(d.subtotal).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['#', 'Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
      body: filas,
      startY: 106,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 130, 200], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' }
      }
    });

    // TOTALES
    const posY = (doc as any).lastAutoTable.finalY + 6;
    doc.setLineWidth(0.3);
    doc.line(120, posY, 196, posY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal (sin IGV):', 122, posY + 7);
    doc.text(`S/ ${Number(venta.subtotal).toFixed(2)}`, 196, posY + 7, { align: 'right' });
    doc.text('IGV (18%):', 122, posY + 14);
    doc.text(`S/ ${Number(venta.igv).toFixed(2)}`, 196, posY + 14, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 122, posY + 23);
    doc.text(`S/ ${Number(venta.total).toFixed(2)}`, 196, posY + 23, { align: 'right' });

    // PIE
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Gracias por su compra.', 105, posY + 36, { align: 'center' });
    doc.text(`Vendedor: ${venta.usuario?.nombre || 'N/A'}`, 105, posY + 42, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ── PASO 2: PDF completo → subir a Drive ─────────────────
    let urlDrive = '';

    try {
      const pdfBlob = doc.output('blob');
      urlDrive = await this.googleDriveService.subirPDF(pdfBlob, nombreArchivo);
      console.log('Subido a Drive:', urlDrive);
    } catch (error) {
      console.error('Error subiendo a Drive:', error);
      // Si falla Drive, el QR mostrará los datos en texto
      urlDrive = [
        `TECHSTORE`,
        `Boleta: B001-${String(venta.id).padStart(6, '0')}`,
        `Cliente: ${venta.cliente?.nombre || 'N/A'}`,
        `DNI: ${venta.cliente?.dni || 'N/A'}`,
        `Total: S/ ${Number(venta.total).toFixed(2)}`,
        `Pago: ${venta.tipoPago}`
      ].join('\n');
    }

    // ── PASO 3: Generar QR con la URL de Drive ────────────────
    const qrBase64 = await QRCode.toDataURL(urlDrive, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    // ── PASO 4: Insertar QR en el PDF ────────────────────────
    doc.addImage(qrBase64, 'PNG', 150, 45, 45, 45);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Escanea para ver boleta', 174, 89, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ── PASO 5: Descargar el PDF final con QR ────────────────
    doc.save(nombreArchivo);
  }
}
