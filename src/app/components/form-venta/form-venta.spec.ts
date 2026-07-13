import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormVentaComponent } from './form-venta';

describe('FormVenta', () => {
  let component: FormVentaComponent;
  let fixture: ComponentFixture<FormVentaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormVentaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
