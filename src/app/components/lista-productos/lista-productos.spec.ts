import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaProductosComponent } from './lista-productos';

describe('ListaProductos', () => {
  let component: ListaProductosComponent;
  let fixture: ComponentFixture<ListaProductosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaProductosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaProductosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
