import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientesService } from '../../services/clientes';
import { Cliente } from '../../interfaces/cliente';

@Component({
  selector: 'app-form-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form-cliente.html',
  styleUrls: ['./form-cliente.css']
})
export class FormClienteComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  clienteForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  clienteId?: number;

  constructor() {
    this.clienteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      dni: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8), Validators.pattern('^[0-9]*$')]],
      correo: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.pattern('^[0-9]*$'), Validators.minLength(9), Validators.maxLength(9)]],
      direccion: ['', ]
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.clienteId = +params['id'];
        this.cargarCliente(this.clienteId);
      }
    });
  }

  cargarCliente(id: number) {
    this.isLoading = true;
    this.clientesService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.clienteForm.patchValue(cliente);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando cliente:', error);
        this.errorMessage = 'Error al cargar el cliente';
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.clienteForm.invalid) {
      this.marcarCamposComoTouched();
      return;
    }

    // VALIDACIÓN MANUAL DE LONGITUDES
    const nombre = this.clienteForm.get('nombre')?.value;
    const dni = this.clienteForm.get('dni')?.value;
    const correo = this.clienteForm.get('correo')?.value;
    const telefono = this.clienteForm.get('telefono')?.value;
    const direccion = this.clienteForm.get('direccion')?.value;

    if (nombre && nombre.length > 100) {
      this.errorMessage = 'El nombre del cliente no puede exceder los 100 caracteres';
      return;
    }

    if (correo && correo.length > 100) {
      this.errorMessage = 'El correo electrónico no puede exceder los 100 caracteres';
      return;
    }

    if (telefono && telefono.length > 9) {
      this.errorMessage = 'El teléfono no puede exceder los 9 dígitos';
      return;
    }

    if (direccion && direccion.length > 150) {
      this.errorMessage = 'La dirección no puede exceder los 150 caracteres';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const clienteData: Cliente = this.clienteForm.value;

    if (this.isEditMode && this.clienteId) {
      this.clientesService.updateCliente(this.clienteId, clienteData).subscribe({
        next: () => {
          this.successMessage = 'Cliente actualizado correctamente';
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/clientes']), 1500);
        },
        error: (error) => {
          console.error('Error actualizando cliente:', error);
          this.errorMessage = error.error?.error || 'Error al actualizar el cliente';
          this.isLoading = false;
        }
      });
    } else {
      this.clientesService.createCliente(clienteData).subscribe({
        next: () => {
          this.successMessage = 'Cliente creado correctamente';
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/clientes']), 1500);
        },
        error: (error) => {
          console.error('Error creando cliente:', error);
          this.errorMessage = error.error?.error || 'Error al crear el cliente';
          this.isLoading = false;
        }
      });
    }
  }

  marcarCamposComoTouched() {
    Object.keys(this.clienteForm.controls).forEach(key => {
      const control = this.clienteForm.get(key);
      control?.markAsTouched();
    });
  }

  volverAlMenu() {
    this.router.navigate(['/dashboard']);
  }

  // Getters para los controles del formulario con tipo seguro
  get nombre(): AbstractControl | null { return this.clienteForm.get('nombre'); }
  get dni(): AbstractControl | null { return this.clienteForm.get('dni'); }
  get correo(): AbstractControl | null { return this.clienteForm.get('correo'); }
  get telefono(): AbstractControl | null { return this.clienteForm.get('telefono'); }
  get direccion(): AbstractControl | null { return this.clienteForm.get('direccion'); }
}