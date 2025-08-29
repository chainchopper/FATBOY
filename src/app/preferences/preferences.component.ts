import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.css']
})
export class PreferencesComponent {
  preferences = {
    avoidArtificialSweeteners: true,
    avoidArtificialColors: true,
    avoidHFCS: true,
    avoidPreservatives: false,
    avoidMSG: false,
    avoidTransFats: true,
    maxCalories: 200,
    goal: 'avoidChemicals' // 'strictlyNatural', 'avoidChemicals', 'calorieCount'
  };

  savePreferences() {
    localStorage.setItem('fatBoyPreferences', JSON.stringify(this.preferences));
    alert('Preferences saved!');
  }

  ngOnInit() {
    const saved = localStorage.getItem('fatBoyPreferences');
    if (saved) {
      this.preferences = JSON.parse(saved);
    }
  }
}