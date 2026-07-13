import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from '../../services/usuarios';
import { AuthService } from '../../services/auth';
import { Usuario } from '../../interfaces/usuario';

@Component({
  selector: 'app-form-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form-usuario.html',
  styleUrls: ['./form-usuario.css']
})
export class FormUsuarioComponent implements OnInit {
  usuarioForm: FormGroup;
  isEdit: boolean = false;
  usuarioId: number | null = null;
  loading: boolean = false;
  error: string = '';

  roles = ['ADMIN', 'USER'];
  estados = ['ACTIVO', 'INACTIVO'];

  // Propiedades para las validaciones de password en el template
  passwordLengthValid: boolean = false;
  passwordUppercaseValid: boolean = false;
  passwordLowercaseValid: boolean = false;
  passwordNumberValid: boolean = false;
  passwordSpecialCharValid: boolean = false;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.usuarioForm = this.createForm();
  }

  ngOnInit(): void {
    console.log('Inicializando formulario de usuario...');
    this.verificarPermisos();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.usuarioId = +params['id'];
        console.log('Modo edición para usuario ID:', this.usuarioId);
        this.cargarUsuario(this.usuarioId);
      } else {
        console.log('Modo creación de nuevo usuario');
      }
    });

    // Suscribirse a cambios en el campo password
    this.passwordControl?.valueChanges.subscribe(value => {
      this.updatePasswordValidations(value);
    });
  }

  verificarPermisos(): void {
    const token = this.authService.getToken();
    const user = this.authService.getCurrentUser();

    console.log('Token:', token ? 'Presente' : 'Ausente');
    console.log('Usuario:', user);
    console.log('Rol:', user?.rol);
    console.log('Es ADMIN?:', this.authService.isAdmin());

    if (!this.authService.isAdmin()) {
      this.error = 'No tienes permisos de ADMIN para gestionar usuarios';
      console.error('Usuario no tiene permisos de ADMIN');
    }
  }

  createForm(): FormGroup {
    const form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator
      ]],
      confirmPassword: ['', Validators.required],
      rol: ['USER', Validators.required],
      estado: ['ACTIVO', Validators.required]
    }, { validators: this.passwordMatchValidator });

    return form;
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const errors: ValidationErrors = {};

    if (!hasUpperCase) errors['uppercase'] = true;
    if (!hasLowerCase) errors['lowercase'] = true;
    if (!hasNumeric) errors['numeric'] = true;
    if (!hasSpecialChar) errors['specialChar'] = true;

    return Object.keys(errors).length ? errors : null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  updatePasswordValidations(value: string): void {
    this.passwordLengthValid = value?.length >= 8 || false;
    this.passwordUppercaseValid = /[A-Z]/.test(value) || false;
    this.passwordLowercaseValid = /[a-z]/.test(value) || false;
    this.passwordNumberValid = /[0-9]/.test(value) || false;
    this.passwordSpecialCharValid = /[!@#$%^&*(),.?":{}|<>]/.test(value) || false;
  }

  cargarUsuario(id: number): void {
    this.loading = true;
    this.usuarioService.getUsuarioById(id).subscribe({
      next: (usuario) => {
        console.log('Usuario cargado:', usuario);
        this.usuarioForm.patchValue({
          nombre: usuario.nombre,
          username: usuario.username,
          rol: usuario.rol,
          estado: usuario.estado,
          password: '',
          confirmPassword: ''
        });

        // En modo edición, hacer la contraseña opcional
        if (this.isEdit) {
          this.passwordControl?.clearValidators();
          this.passwordControl?.setValidators([
            Validators.minLength(8),
            this.passwordValidator
          ]);
          this.confirmPasswordControl?.clearValidators();

          this.passwordControl?.updateValueAndValidity();
          this.confirmPasswordControl?.updateValueAndValidity();
        }

        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = 'Error al cargar el usuario';
        this.loading = false;
        console.error('Error cargando usuario:', error);
      }
    });
  }

  onSubmit(): void {
    console.log('Enviando formulario...');

    if (!this.authService.isAdmin()) {
      this.error = 'No tienes permisos de ADMIN para realizar esta acción';
      return;
    }

    if (this.usuarioForm.valid) {
      this.loading = true;
      this.error = '';

      // Para nuevos usuarios, la contraseña es obligatoria
      if (!this.isEdit && (!this.usuarioForm.value.password || this.usuarioForm.value.password.trim() === '')) {
        this.error = 'La contraseña es requerida para nuevos usuarios';
        this.loading = false;
        return;
      }

      // Crear objeto para enviar al backend
      const usuarioData: Usuario = {
        nombre: this.usuarioForm.value.nombre,
        username: this.usuarioForm.value.username,
        rol: this.usuarioForm.value.rol,
        estado: this.usuarioForm.value.estado
      };

      // Solo incluir password si se proporcionó y no está vacía
      const password = this.usuarioForm.value.password;
      if (password && password.trim() !== '') {
        usuarioData.password = password;
      }

      console.log('Datos a enviar:', usuarioData);

      if (this.isEdit && this.usuarioId) {
        console.log('Actualizando usuario ID:', this.usuarioId);
        this.usuarioService.updateUsuario(this.usuarioId, usuarioData).subscribe({
          next: (response) => {
            console.log('Usuario actualizado:', response);
            this.loading = false;
            this.router.navigate(['/usuarios']);
          },
          error: (error: HttpErrorResponse) => {
            this.handleError(error, 'actualizar');
          }
        });
      } else {
        console.log('Creando nuevo usuario');
        this.usuarioService.createUsuario(usuarioData).subscribe({
          next: (response) => {
            console.log('Usuario creado:', response);
            this.loading = false;
            this.router.navigate(['/usuarios']);
          },
          error: (error: HttpErrorResponse) => {
            this.handleError(error, 'crear');
          }
        });
      }
    } else {
      console.log('Formulario inválido');
      this.marcarCamposComoTocados();
    }
  }

  private handleError(error: HttpErrorResponse, action: string): void {
    this.loading = false;
    console.error(`Error al ${action} usuario:`, error);

    if (error.status === 403) {
      this.error = 'ERROR 403: Acceso denegado. Verifica tu autenticación.';
    } else if (error.status === 401) {
      this.error = 'No estás autenticado. Inicia sesión nuevamente.';
      this.router.navigate(['/login']);
    } else if (error.status === 400 && error.error?.error?.includes('nombre de usuario')) {
      this.error = 'El nombre de usuario ya existe';
      this.usuarioForm.get('username')?.setErrors({ 'duplicate': true });
    } else if (error.status === 400) {
      this.error = error.error?.error || 'Datos inválidos';
    } else {
      this.error = `Error al ${action} el usuario: ${error.message || 'Error desconocido'}`;
    }
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.usuarioForm.controls).forEach(key => {
      const control = this.usuarioForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters para el template
  get nombreControl() { return this.usuarioForm.get('nombre'); }
  get usernameControl() { return this.usuarioForm.get('username'); }
  get passwordControl() { return this.usuarioForm.get('password'); }
  get confirmPasswordControl() { return this.usuarioForm.get('confirmPassword'); }
  get rolControl() { return this.usuarioForm.get('rol'); }
  get estadoControl() { return this.usuarioForm.get('estado'); }

  getPasswordErrors(): string[] {
    const errors: string[] = [];
    const passwordErrors = this.passwordControl?.errors;

    if (passwordErrors) {
      if (passwordErrors['required']) errors.push('La contraseña es requerida');
      if (passwordErrors['minlength']) errors.push('Mínimo 8 caracteres');
      if (passwordErrors['uppercase']) errors.push('Al menos una mayúscula');
      if (passwordErrors['lowercase']) errors.push('Al menos una minúscula');
      if (passwordErrors['numeric']) errors.push('Al menos un número');
      if (passwordErrors['specialChar']) errors.push('Al menos un carácter especial');
    }

    return errors;
  }
}
