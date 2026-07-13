import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../services/productos';
import { CategoriasService } from '../../services/categorias';
import { Producto } from '../../interfaces/producto';
import { Categoria } from '../../interfaces/categoria';

@Component({
  selector: 'app-form-producto',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form-producto.html',
  styleUrl: './form-producto.css'
})
export class FormProductoComponent implements OnInit {
  private productosService = inject(ProductosService);
  private categoriasService = inject(CategoriasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdRef = inject(ChangeDetectorRef);

  productoForm: FormGroup;
  categorias: Categoria[] = [];
  isEdit = false;
  isLoading = false;
  isLoadingCategorias = true;
  isVerificando = false;
  errorMessage = '';
  successMessage = '';
  productoId?: number;

  unidades = ['Unidad', 'Kilo', 'Litro', 'Metro', 'Caja', 'Lata', 'Paquete', 'Tableta', 'Botella', 'Frasco', 'Bolsa'];
  estados = ['ACTIVO', 'INACTIVO'];

  constructor() {
    this.productoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      categoriaId: ['', Validators.required],
      marca: [''],
      modelo: [''],
      descripcion: ['', Validators.required],
      precioCompra: [0, [Validators.required, Validators.min(0)]],
      precioVenta: [0, [Validators.required, Validators.min(0.01)]],
      cantidad: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [10, [Validators.required, Validators.min(1)]],
      unidad: ['Unidad', Validators.required],
      estado: ['ACTIVO', Validators.required]
    }, { validators: this.precioValidoValidator });
  }

  ngOnInit() {
    this.cargarCategorias();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.productoId = Number(id);
      this.cargarProducto(this.productoId);
    }

    this.productoForm.get('nombre')?.valueChanges.subscribe(() => {
      if (this.productoForm.get('nombre')?.valid && this.productoForm.get('categoriaId')?.valid) {
        this.verificarProductoExistente();
      }
    });

    this.productoForm.get('categoriaId')?.valueChanges.subscribe(() => {
      if (this.productoForm.get('nombre')?.valid && this.productoForm.get('categoriaId')?.valid) {
        this.verificarProductoExistente();
      }
    });
  }

  precioValidoValidator(control: AbstractControl) {
    const precioCompra = control.get('precioCompra')?.value;
    const precioVenta = control.get('precioVenta')?.value;
    if (precioCompra !== null && precioVenta !== null && precioVenta < precioCompra) {
      return { precioInvalido: true };
    }
    return null;
  }

  cargarCategorias() {
    this.isLoadingCategorias = true;
    this.categoriasService.getCategoriasActivas().subscribe({
      next: (data) => {
        this.categorias = data;
        this.isLoadingCategorias = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.isLoadingCategorias = false;
        this.cdRef.detectChanges
      }
    });
  }

  cargarProducto(id: number) {
    this.isLoading = true;
    this.productosService.getProductoById(id).subscribe({
      next: (producto) => {
        this.productoForm.patchValue({
          nombre: producto.nombre,
          categoriaId: producto.categoriaId,
          marca: producto.marca || '',
          modelo: producto.modelo || '',
          descripcion: producto.descripcion,
          precioCompra: producto.precioCompra || 0,
          precioVenta: producto.precioVenta || 0,
          cantidad: producto.cantidad || 0,
          stockMinimo: producto.stockMinimo || 10,
          unidad: producto.unidad || 'Unidad',
          estado: producto.estado || 'ACTIVO'
        });
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando producto:', error);
        this.errorMessage = 'Error al cargar el producto';
        this.isLoading = false;
        this.cdRef.detectChanges();
      }
    });
  }

  verificarProductoExistente() {
    const nombre = this.productoForm.get('nombre')?.value;
    const categoriaId = this.productoForm.get('categoriaId')?.value;

    if (!nombre || !categoriaId) {
      this.productoForm.get('nombre')?.setErrors(null);
      return;
    }

    this.isVerificando = true;
    this.productoForm.get('nombre')?.setErrors({ verificando: true });

    this.productosService.verificarProductoExistente(
      nombre,
      categoriaId,
      this.productoId
    ).subscribe({
      next: (existe) => {
        this.isVerificando = false;
        if (existe) {
          this.productoForm.get('nombre')?.setErrors({ duplicado: true });
        } else {
          this.productoForm.get('nombre')?.setErrors(null);
        }
      },
      error: (error) => {
        this.isVerificando = false;
        this.productoForm.get('nombre')?.setErrors(null);
        console.error('Error verificando producto:', error);
      }
    });
  }

  onSubmit() {
    if (this.productoForm.invalid) {
      this.marcarCamposComoTouched();
      this.errorMessage = 'Por favor, complete todos los campos requeridos correctamente.';
      return;
    }

    if (this.productoForm.hasError('precioInvalido')) {
      this.errorMessage = 'El precio de venta debe ser mayor o igual al precio de compra.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const productoData: Producto = this.productoForm.value;

    if (this.isEdit && this.productoId) {
      this.actualizarProducto(this.productoId, productoData);
    } else {
      this.crearProducto(productoData);
    }
  }

  crearProducto(producto: Producto) {
    this.productosService.createProducto(producto).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Producto creado exitosamente';
        setTimeout(() => {
          this.router.navigate(['/productos']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error creando producto:', error);
        this.errorMessage = error.error?.error || 'Error al crear el producto';
        this.isLoading = false;
      }
    });
  }

  actualizarProducto(id: number, producto: Producto) {
    this.productosService.updateProducto(id, producto).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Producto actualizado exitosamente';
        setTimeout(() => {
          this.router.navigate(['/productos']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error actualizando producto:', error);
        this.errorMessage = error.error?.error || 'Error al actualizar el producto';
        this.isLoading = false;
      }
    });
  }

  marcarCamposComoTouched() {
    Object.keys(this.productoForm.controls).forEach(key => {
      const control = this.productoForm.get(key);
      control?.markAsTouched();
    });
  }

  calcularGanancia(): number {
    const compra = this.productoForm.get('precioCompra')?.value || 0;
    const venta = this.productoForm.get('precioVenta')?.value || 0;
    return compra > 0 ? ((venta - compra) / compra) * 100 : 0;
  }

  get nombre() { return this.productoForm.get('nombre'); }
  get categoriaId() { return this.productoForm.get('categoriaId'); }
  get marca() { return this.productoForm.get('marca'); }
  get modelo() { return this.productoForm.get('modelo'); }
  get descripcion() { return this.productoForm.get('descripcion'); }
  get precioCompra() { return this.productoForm.get('precioCompra'); }
  get precioVenta() { return this.productoForm.get('precioVenta'); }
  get cantidad() { return this.productoForm.get('cantidad'); }
  get stockMinimo() { return this.productoForm.get('stockMinimo'); }
  get unidad() { return this.productoForm.get('unidad'); }
  get estado() { return this.productoForm.get('estado'); }

  getMensajeError(campo: string): string {
    const control = this.productoForm.get(campo);

    if (control?.errors?.['required'] && control.touched) {
      return 'Este campo es requerido';
    }
    if (control?.errors?.['minlength'] && control.touched) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control?.errors?.['min'] && control.touched) {
      return `El valor mínimo es ${control.errors['min'].min}`;
    }
    if (control?.errors?.['duplicado'] && control.touched) {
      return 'Ya existe un producto con este nombre en la categoría seleccionada';
    }
    if (control?.errors?.['verificando']) {
      return 'Verificando disponibilidad...';
    }

    return '';
  }
}
