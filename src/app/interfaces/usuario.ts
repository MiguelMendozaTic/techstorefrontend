export interface Usuario {
    id?: number;
    nombre: string;
    username: string;
    password?: string;
    rol: string;
    estado: string;
    fechaCreacion?: string;
  }

  export interface UsuarioResponse {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    estado: string;
    fechaCreacion: string;
  }
