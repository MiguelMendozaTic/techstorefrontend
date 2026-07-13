import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoriasService } from '../../services/categorias';
import { Categoria } from '../../interfaces/categoria';

@Component({
  selector: 'app-form-categoria',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form-categoria.html',
  styleUrl: './form-categoria.css'
})
export class FormCategoriaComponent implements OnInit {
  private categoriasService = inject(CategoriasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  categoriaForm: FormGroup;
  isEdit = false;
  isLoading = false;
  isVerificando = false;
  errorMessage = '';
  successMessage = '';
  categoriaId?: number;

  estados = ['ACTIVO', 'INACTIVO'];

  constructor() {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      descripcion: [''],
      estado: ['ACTIVO', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.categoriaId = Number(id);
      this.cargarCategoria(this.categoriaId);
    }

    // Verificar duplicados cuando cambia el nombre
    this.categoriaForm.get('nombre')?.valueChanges.subscribe(() => {
      if (this.categoriaForm.get('nombre')?.valid) {
        this.verificarCategoriaExistente();
      }
    });
  }

  cargarCategoria(id: number) {
    this.isLoading = true;
    this.categoriasService.getCategoriaById(id).subscribe({
      next: (categoria) => {
        this.categoriaForm.patchValue({
          nombre: categoria.nombre,
          descripcion: categoria.descripcion || '',
          estado: categoria.estado || 'ACTIVO'
        });
        this.cdr.detectChanges();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando categoría:', error);
        this.errorMessage = 'Error al cargar la categoría';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  verificarCategoriaExistente() {
    const nombre = this.categoriaForm.get('nombre')?.value;

    if (!nombre) {
      this.categoriaForm.get('nombre')?.setErrors(null);
      return;
    }

    this.isVerificando = true;
    this.categoriaForm.get('nombre')?.setErrors({ verificando: true });

    this.categoriasService.verificarCategoriaExistente(
      nombre,
      this.categoriaId
    ).subscribe({
      next: (existe) => {
        this.isVerificando = false;
        if (existe) {
          this.categoriaForm.get('nombre')?.setErrors({ duplicado: true });
          this.cdr.detectChanges();
        } else {
          this.categoriaForm.get('nombre')?.setErrors(null);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.isVerificando = false;
        this.categoriaForm.get('nombre')?.setErrors(null);
        this.cdr.detectChanges();
        console.error('Error verificando categoría:', error);
      }
    });
  }

  onSubmit() {
    if (this.categoriaForm.invalid) {
      this.marcarCamposComoTouched();
      this.errorMessage = 'Por favor, complete todos los campos requeridos correctamente.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const categoriaData: Categoria = this.categoriaForm.value;

    if (this.isEdit && this.categoriaId) {
      this.actualizarCategoria(this.categoriaId, categoriaData);
    } else {
      this.crearCategoria(categoriaData);
    }
  }

  crearCategoria(categoria: Categoria) {
    this.categoriasService.createCategoria(categoria).subscribe({
      next: (categoriaCreada) => {
        this.isLoading = false;
        this.successMessage = 'Categoría creada exitosamente';
        setTimeout(() => {
          this.router.navigate(['/categorias']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error creando categoría:', error);
        this.errorMessage = error.error?.error || 'Error al crear la categoría';
        this.isLoading = false;
      }
    });
  }

  actualizarCategoria(id: number, categoria: Categoria) {
    this.categoriasService.updateCategoria(id, categoria).subscribe({
      next: (categoriaActualizada) => {
        this.isLoading = false;
        this.successMessage = 'Categoría actualizada exitosamente';
        setTimeout(() => {
          this.router.navigate(['/categorias']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error actualizando categoría:', error);
        this.errorMessage = error.error?.error || 'Error al actualizar la categoría';
        this.isLoading = false;
      }
    });
  }

  marcarCamposComoTouched() {
    Object.keys(this.categoriaForm.controls).forEach(key => {
      const control = this.categoriaForm.get(key);
      control?.markAsTouched();
    });
  }

  get nombre() { return this.categoriaForm.get('nombre'); }
  get descripcion() { return this.categoriaForm.get('descripcion'); }
  get estado() { return this.categoriaForm.get('estado'); }

  getMensajeError(campo: string): string {
    const control = this.categoriaForm.get(campo);

    if (control?.errors?.['required'] && control.touched) {
      return 'Este campo es requerido';
    }

    if (control?.errors?.['minlength'] && control.touched) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }

    if (control?.errors?.['duplicado'] && control.touched) {
      return 'Ya existe una categoría con este nombre';
    }

    if (control?.errors?.['verificando']) {
      return 'Verificando disponibilidad...';
    }

    return '';
  }
}
