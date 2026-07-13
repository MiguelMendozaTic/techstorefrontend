import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {

  private CLIENT_ID = '328076956337-1ujm3qqk1gfel8gaccbefje7k1ssn8mh.apps.googleusercontent.com';
  private SCOPES = 'https://www.googleapis.com/auth/drive.file';
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private inicializado = false; // ← controla si ya se cargó el script

  inicializar(): Promise<void> {
    // Si ya se inicializó antes, no volver a cargar el script
    if (this.inicializado && this.tokenClient) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Si el script ya está en el DOM, usarlo directo
      if ((window as any).google?.accounts?.oauth2) {
        this.crearTokenClient();
        this.inicializado = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.crearTokenClient();
        this.inicializado = true;
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  private crearTokenClient() {
    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          console.log('Token obtenido correctamente');
        }
      }
    });
  }

  async autenticar(): Promise<string> {
    if (!this.tokenClient) {
      await this.inicializar();
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          console.error('Error de autenticación:', response.error);
          reject(new Error(response.error));
          return;
        }
        this.accessToken = response.access_token;
        console.log('Autenticado con Google');
        resolve(response.access_token);
      };
      // prompt: '' evita el popup si ya tiene sesión activa
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  async subirPDF(pdfBlob: Blob, nombreArchivo: string): Promise<string> {
    console.log('Iniciando subida a Drive...');

    await this.inicializar();

    // Si no hay token, autenticar
    if (!this.accessToken) {
      console.log('Sin token, solicitando autenticación...');
      await this.autenticar();
    }

    console.log('Subiendo archivo:', nombreArchivo);

    const metadata = {
      name: nombreArchivo,
      mimeType: 'application/pdf'
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', pdfBlob);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Error HTTP al subir:', errorData);

      // Si el token expiró, limpiar y reintentar una vez
      if (uploadResponse.status === 401) {
        console.log('Token expirado, renovando...');
        this.accessToken = null;
        await this.autenticar();
        return this.subirPDF(pdfBlob, nombreArchivo);
      }

      throw new Error(`Error al subir: ${errorData.error?.message || uploadResponse.status}`);
    }

    const archivo = await uploadResponse.json();
    const fileId = archivo.id;

    if (!fileId) {
      throw new Error('Drive no devolvió un fileId válido');
    }

    console.log('Archivo subido con ID:', fileId);

    // Hacer público
    const permResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      }
    );

    if (!permResponse.ok) {
      console.error('Error al hacer público el archivo');
    }

    const url = `https://drive.google.com/open?id=${fileId}`;
    console.log('=== URL FINAL ===', url);
    return url;
  }
}
