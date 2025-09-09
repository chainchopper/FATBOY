import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  private isMenuOpenSubject = new BehaviorSubject<boolean>(false);
  public isMenuOpen$: Observable<boolean> = this.isMenuOpenSubject.asObservable();

  toggleMenu(): void {
    this.isMenuOpenSubject.next(!this.isMenuOpenSubject.getValue());
  }

  closeMenu(): void {
    this.isMenuOpenSubject.next(false);
  }
}