import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConsoleCommandService {
  private commandSubject = new BehaviorSubject<string | null>(null);
  public command$ = this.commandSubject.asObservable();

  setCommand(command: string) {
    this.commandSubject.next(command);
  }

  getCommand(): string | null {
    const command = this.commandSubject.getValue();
    this.commandSubject.next(null); // Clear command after getting it
    return command;
  }
}