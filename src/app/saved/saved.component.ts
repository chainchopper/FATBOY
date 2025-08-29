import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.css']
})
export class SavedComponent implements OnInit {
  savedProducts: any[] = [];

  ngOnInit() {
    const saved = localStorage.getItem('savedProducts');
    if (saved) {
      this.savedProducts = JSON.parse(saved);
    }
  }

  removeProduct(index: number) {
    this.savedProducts.splice(index, 1);
    localStorage.setItem('savedProducts', JSON.stringify(this.savedProducts));
  }
}