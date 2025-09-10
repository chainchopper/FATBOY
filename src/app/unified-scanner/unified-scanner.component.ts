import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

// Import new services
import { UnifiedScannerService } from '../services/unified-scanner.service'; // New service
import { ScannerCameraService } from '../services/scanner-camera.service'; // Still needed for direct camera access
import { StabilityDetectorService } from '../services/stability-detector.service'; // Still needed for direct stability access

// Import existing services
import { PreferencesService } from '../services/preferences.service';
import { SpeechService } from '../services/speech.service';
import { UiService } from '../services/ui.service';
import { UserNotificationService } from '../services/user-notification.service';
import { NotificationsComponent } from '../notifications/notifications.component';
import { CameraFeedComponent } from '../camera-feed/camera-feed.component'; // Not used directly for main scanner, but good to keep for context

@Component({
  selector: 'app-unified-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, NotificationsComponent, CameraFeedComponent],
  templateUrl: './unified-scanner.component.html',
  styleUrls: ['./unified-scanner.component.css']
})
export class UnifiedScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  showExpandedOptions = false;
  showNotifications = false; // Declare showNotifications property

  public unreadNotifications$!: Observable<number>;
  private voiceCommandSubscription!: Subscription;
  private preferencesSubscription!: Subscription;
  private scannerStateSubscription!: Subscription;

  constructor(
    private router: Router,
    public unifiedScannerService: UnifiedScannerService, // Inject the new service
    private scannerCameraService: ScannerCameraService, // Keep for direct video/image access
    private stabilityDetectorService: StabilityDetectorService, // Keep for direct stability access
    private preferencesService: PreferencesService,
    private speechService: SpeechService,
    public uiService: UiService,
    private userNotificationService: UserNotificationService,
  ) {
    this.unreadNotifications$ = this.userNotificationService.unreadCount$;
  }

  async ngAfterViewInit() {
    // Set camera elements for the service
    this.unifiedScannerService.setCameraElements(
      () => this.scannerCameraService.getVideoElement(),
      () => this.canvasElement.nativeElement
    );

    await this.unifiedScannerService.startAllScanningFeatures('reader');

    this.preferencesSubscription = this.preferencesService.preferences$.subscribe(prefs => {
      // Voice listening is now managed by the service, but component can reflect state
      // this.isVoiceListening = prefs.enableVoiceCommands; // Removed, service manages
    });

    this.voiceCommandSubscription = this.speechService.commandRecognized.subscribe(command => {
      this.handleVoiceCommand(command);
    });

    // Subscribe to scanner state changes from the service
    this.scannerStateSubscription = this.unifiedScannerService.scannerStateChanged.subscribe(() => {
      // Force change detection if needed, as service updates might not trigger it automatically
      // this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.unifiedScannerService.ngOnDestroy(); // Call service's onDestroy
    this.voiceCommandSubscription?.unsubscribe();
    this.preferencesSubscription?.unsubscribe();
    this.scannerStateSubscription?.unsubscribe();
  }

  get isVoiceListening(): boolean {
    return this.speechService.listening; // Get state directly from SpeechService
  }

  toggleVoiceListening(): void {
    const currentPrefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({ ...currentPrefs, enableVoiceCommands: !currentPrefs.enableVoiceCommands });
  }

  private handleVoiceCommand(command: string): void {
    if (command.includes('scan label') || command.includes('capture label')) {
      this.unifiedScannerService.handleStableFrameCapture(); // Delegate to service
      this.speechService.speak('Scanning label.');
    } else if (command.includes('go to history')) {
      this.router.navigate(['/history']);
      this.speechService.speak('Going to history.');
    } else if (command.includes('upload image')) {
      this.triggerFileUpload();
      this.speechService.speak('Opening file upload.');
    } else {
      this.speechService.speak('Command not recognized. Please try again.');
    }
  }

  toggleExpandedOptions(): void {
    if (this.showExpandedOptions) { // Collapsing options
      this.unifiedScannerService.resumeAllDetectionServices(); // Resume all scanning features
    } else { // Expanding options
      this.unifiedScannerService.pauseAllDetectionServices(); // Pause all detection
    }
    this.showExpandedOptions = !this.showExpandedOptions;
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.unifiedScannerService.processUploadedFile(file); // Delegate to service
    }
  }
}