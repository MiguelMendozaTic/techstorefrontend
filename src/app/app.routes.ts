import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { ListaProductosComponent } from './components/lista-productos/lista-productos';
import { FormProductoComponent } from './components/form-producto/form-producto';
import { ListaUsuariosComponent } from './components/lista-usuarios/lista-usuarios';
import { FormUsuarioComponent } from './components/form-usuario/form-usuario';
import { ListaCategoriasComponent } from './components/lista-categorias/lista-categorias';
import { FormCategoriaComponent } from './components/form-categoria/form-categoria';
import { AyudaComponent } from './components/ayuda/ayuda';
import { ListaVentasComponent } from './components/lista-ventas/lista-ventas';
import { FormVentaComponent } from './components/form-venta/form-venta';
import { ListaClientesComponent } from './components/lista-clientes/lista-clientes';
import { FormClienteComponent } from './components/form-cliente/form-cliente';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard'
      },
      {
        path: 'productos',
        component: ListaProductosComponent,
        title: 'Productos'
      },
      {
        path: 'productos/nuevo',
        component: FormProductoComponent,
        title: 'Nuevo Producto'
      },
      {
        path: 'productos/editar/:id',
        component: FormProductoComponent,
        title: 'Editar Producto'
      },
      {
        path: 'usuarios',
        component: ListaUsuariosComponent,
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'usuarios/nuevo',
        component: FormUsuarioComponent,
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'usuarios/editar/:id',
        component: FormUsuarioComponent,
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'categorias',
        component: ListaCategoriasComponent,
        title: 'Categorías'
      },
      {
        path: 'categorias/nuevo',
        component: FormCategoriaComponent,
        title: 'Nueva Categoría'
      },
      {
        path: 'categorias/editar/:id',
        component: FormCategoriaComponent,
        title: 'Editar Categoría'
      },
      {
        path: 'ventas',
        component: ListaVentasComponent
      },
      {
        path: 'ventas/nueva',
        component: FormVentaComponent
      },
      {
        path: 'clientes',
        component: ListaClientesComponent,
        title: 'Clientes'
      },
      {
        path: 'clientes/nuevo',
        component: FormClienteComponent,
        title: 'Nuevo Cliente'
      },
      {
        path: 'clientes/editar/:id',
        component: FormClienteComponent,
        title: 'Editar Cliente'
      },
      {
        path: 'ayuda',
        component: AyudaComponent,
        title: 'Ayuda y Soporte'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
