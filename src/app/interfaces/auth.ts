export interface LoginRequest {
    username: string;
    password: string;
  }

  export interface AuthResponse {
    token: string;
    usuario: {
      id: number;
      nombre: string;
      username: string;
      rol: string;
    };
  }

  export interface Usuario {
    id?: number;
    nombre: string;
    username: string;
    password?: string;
    rol: string;
    estado?: string;
    fechaCreacion?: string;
  }
