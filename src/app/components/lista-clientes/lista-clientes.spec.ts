import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaClientes } from './lista-clientes';

describe('ListaClientes', () => {
  let component: ListaClientes;
  let fixture: ComponentFixture<ListaClientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaClientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaClientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
