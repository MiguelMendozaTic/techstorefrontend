import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaVentasComponent } from './lista-ventas';

describe('ListaVentas', () => {
  let component: ListaVentasComponent;
  let fixture: ComponentFixture<ListaVentasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaVentasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaVentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
