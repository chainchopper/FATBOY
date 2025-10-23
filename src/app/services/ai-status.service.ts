import { Injectable } from '@angular/core';
import { BehaviorSubject, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AiIntegrationService } from './ai-integration.service';

export type AiStatus = 'online' | 'offline';

@Injectable({
  providedIn: 'root'
})
export class AiStatusService {
  private statusSubject = new BehaviorSubject<AiStatus>('offline');
  public status$ = this.statusSubject.asObservable();

  constructor(private aiService: AiIntegrationService) {
    // Immediate check, then every 2 min
    timer(0, 120000)
      .pipe(switchMap(() => this.aiService.checkAgentStatus()))
      .subscribe((ok) => this.statusSubject.next(ok ? 'online' : 'offline'));
  }

  getCurrentStatus(): AiStatus {
    return this.statusSubject.getValue();
  }
}