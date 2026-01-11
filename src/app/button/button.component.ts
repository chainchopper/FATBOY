import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSoundDirective } from '../directives/ui-sound.directive';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, UiSoundDirective],
  template: `
    <button 
      [type]="type"
      [disabled]="disabled"
      [ngClass]="getClasses()"
      [appUiSound]="getSoundType()"
      [soundOnHover]="!disabled"
      (click)="onClick.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [] // Tailwind classes will be applied directly via ngClass
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'default';
  @Input() size: ButtonSize = 'default';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<Event>();

  getClasses(): string[] {
    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variantClasses: Record<ButtonVariant, string> = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90', // Using a placeholder for primary, will map to existing theme
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    };

    // Map existing theme colors to shadcn/ui-like variants
    let mappedVariantClasses = '';
    if (this.variant === 'default') {
      // For default, let's try to match the existing 'f038ff' (pink/purple) as a primary feel
      mappedVariantClasses = 'bg-[#f038ff] text-white hover:bg-[#f038ff]/90 shadow-md shadow-[#f038ff]/50';
    } else if (this.variant === 'outline') {
      // For outline, let's try to match the existing '0abdc6' (teal)
      mappedVariantClasses = 'border border-[#0abdc6] text-[#0abdc6] hover:bg-[#0abdc6]/10 shadow-md shadow-[#0abdc6]/30';
    } else if (this.variant === 'destructive') {
      mappedVariantClasses = 'bg-[#F44336] text-white hover:bg-[#F44336]/90 shadow-md shadow-[#F44336]/50';
    } else {
      mappedVariantClasses = variantClasses[this.variant];
    }

    return [baseClasses, mappedVariantClasses, sizeClasses[this.size]];
  }

  getSoundType(): 'click' | 'success' | 'error' {
    if (this.variant === 'destructive') {
      return 'error';
    } else if (this.variant === 'default') {
      return 'success';
    }
    return 'click';
  }
}