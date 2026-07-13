import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormProductoComponent } from './form-producto';

describe('FormProductoComponent', () => {
  let component: FormProductoComponent;
  let fixture: ComponentFixture<FormProductoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormProductoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
