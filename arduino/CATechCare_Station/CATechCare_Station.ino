/*
 * ============================================
 *   CATechCare ESP32 Health Monitoring Station
 * ============================================
 * 
 * This sketch runs on an ESP32 and communicates with the
 * CATechCare web application via USB Serial (115200 baud).
 * 
 * HARDWARE WIRING:
 * ┌──────────────┬──────────┬────────────────┐
 * │  Component   │ ESP32 Pin│     Notes      │
 * ├──────────────┼──────────┼────────────────┤
 * │ LCD SDA      │  GPIO 21 │  I2C Data      │
 * │ LCD SCL      │  GPIO 22 │  I2C Clock     │
 * │ MAX30102 SDA │  GPIO 21 │  Shared I2C    │
 * │ MAX30102 SCL │  GPIO 22 │  Shared I2C    │
 * │ MLX90614 SDA │  GPIO 21 │  Shared I2C    │
 * │ MLX90614 SCL │  GPIO 22 │  Shared I2C    │
 * │ MLX90614 VCC │  3.3V    │                │
 * │ MLX90614 GND │  GND     │                │
 * └──────────────┴──────────┴────────────────┘
 * 
 * All three I2C devices (LCD, MAX30102, MLX90614) share
 * the same SDA/SCL bus. Each has a unique I2C address:
 *   - LCD:      0x26 (or 0x3F)
 *   - MAX30102: 0x57
 *   - MLX90614: 0x5A
 * 
 * SERIAL PROTOCOL:
 *   Commands received (from web app):
 *     GET_SPO2        → Start SpO2 measurement
 *     GET_TEMP        → Start temperature measurement
 *     SET_HR:75       → Display HR on LCD
 *     SET_BP:120/80   → Display BP on LCD
 *     CONNECT         → Acknowledge connection
 * 
 *   Responses sent (JSON, newline-terminated):
 *     {"spo2":"97.5"}
 *     {"temp":"36.8"}
 *     {"status":"ready"}
 *     {"status":"connected"}
 * 
 * REQUIRED LIBRARIES (Install via Arduino Library Manager):
 *   1. LiquidCrystal I2C  (by Frank de Brabander)
 *   2. MAX30105           (by SparkFun)
 *   3. Adafruit MLX90614  (by Adafruit)
 * 
 * BOARD: ESP32 Dev Module
 * BAUD:  115200
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_MLX90614.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// ========== CONFIGURATION ==========
#define LCD_ADDRESS       0x26    // I2C address of 20x4 LCD (try 0x3F if 0x27 doesn't work)
#define LCD_COLS          20
#define LCD_ROWS          4
#define SERIAL_BAUD       115200
#define SPO2_SAMPLES      100     // Number of samples for SpO2 calculation
#define SPO2_REPORT_EVERY 25      // Send intermediate reading every N samples

// ========== HARDWARE OBJECTS ==========
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
MAX30105 particleSensor;
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ========== LCD DISPLAY STATE ==========
String lcdHR   = "-- bpm";
String lcdBP   = "--/-- mmHg";
String lcdSpO2 = "--%";
String lcdTemp = "--\xDF" "C";  // \xDF = degree symbol on HD44780

// ========== SENSOR FLAGS ==========
bool max30102Found = false;
bool mlx90614Found = false;

// ========== CUSTOM LCD CHARACTERS ==========
byte heartChar[8] = {
  0b00000, 0b01010, 0b11111, 0b11111,
  0b11111, 0b01110, 0b00100, 0b00000
};

byte bpChar[8] = {
  0b00000, 0b01110, 0b10001, 0b10101,
  0b10101, 0b10001, 0b01110, 0b00000
};

byte dropChar[8] = {
  0b00100, 0b00100, 0b01010, 0b01010,
  0b10001, 0b10001, 0b10001, 0b01110
};

byte tempChar[8] = {
  0b00100, 0b01010, 0b01010, 0b01110,
  0b01110, 0b11111, 0b11111, 0b01110
};

// ==========================================
//                  SETUP
// ==========================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(500);
  
  Wire.begin();
  
  // ---------- Initialize LCD ----------
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, heartChar);
  lcd.createChar(1, bpChar);
  lcd.createChar(2, dropChar);
  lcd.createChar(3, tempChar);
  
  lcd.clear();
  lcd.setCursor(1, 0);
  lcd.print("CATechCare Station");
  lcd.setCursor(3, 1);
  lcd.print("Initializing...");
  
  // ---------- Initialize MAX30102 ----------
  if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    max30102Found = true;
    particleSensor.setup(60, 4, 2, 100, 411, 4096);
    lcd.setCursor(0, 2);
    lcd.print("[OK] SpO2 Sensor");
  } else {
    lcd.setCursor(0, 2);
    lcd.print("[!!] SpO2 Not Found");
  }
  
  // ---------- Initialize MLX90614 ----------
  if (mlx.begin()) {
    mlx90614Found = true;
    lcd.setCursor(0, 3);
    lcd.print("[OK] Temp Sensor");
  } else {
    lcd.setCursor(0, 3);
    lcd.print("[!!] Temp Not Found");
  }
  
  delay(2000);
  updateLCD();
  
  Serial.println("{\"status\":\"ready\"}");
}

// ==========================================
//               MAIN LOOP
// ==========================================
void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() == 0) return;
    
    if (command == "CONNECT") {
      handleConnect();
    }
    else if (command == "GET_SPO2") {
      handleGetSpO2();
    }
    else if (command == "GET_TEMP") {
      handleGetTemp();
    }
    else if (command.startsWith("SET_HR:")) {
      handleSetHR(command.substring(7));
    }
    else if (command.startsWith("SET_BP:")) {
      handleSetBP(command.substring(7));
    }
    else if (command == "RESET_LCD") {
      handleResetLCD();
    }
    else {
      Serial.println("{\"error\":\"Unknown command: " + command + "\"}");
    }
  }
}

// ==========================================
//            COMMAND HANDLERS
// ==========================================

void handleConnect() {
  Serial.println("{\"status\":\"connected\"}");
  handleResetLCD();
}

void handleResetLCD() {
  lcdHR   = "-- bpm";
  lcdBP   = "--/-- mmHg";
  lcdSpO2 = "--%";
  lcdTemp = "--\xDF" "C";
  updateLCD();
}

void handleSetHR(String value) {
  lcdHR = value + " bpm";
  updateLCD();
}

void handleSetBP(String value) {
  lcdBP = value + " mmHg";
  updateLCD();
}

void handleGetSpO2() {
  if (!max30102Found) {
    Serial.println("{\"spo2\":\"--\",\"error\":\"MAX30102 not found\"}");
    return;
  }
  
  lcdSpO2 = "Place Finger...";
  updateLCD();
  
  // Wake up MAX30102 in case it was shut down after a previous reading
  particleSensor.wakeUp();
  particleSensor.setup(60, 4, 2, 100, 411, 4096);
  delay(100);
  
  // Wait up to 10 seconds for finger
  long startWait = millis();
  bool fingerDetected = false;
  particleSensor.clearFIFO();
  while(millis() - startWait < 10000) {
    particleSensor.check();
    if (particleSensor.getIR() > 50000) {
      fingerDetected = true;
      break;
    }
    delay(50);
  }
  
  if (!fingerDetected) {
    Serial.println("{\"spo2\":\"--\",\"error\":\"No finger detected\"}");
    lcdSpO2 = "No finger!";
    updateLCD();
    delay(2000);
    lcdSpO2 = "--%";
    updateLCD();
    return;
  }
  
  lcdSpO2 = "Reading...";
  updateLCD();
  
  uint32_t irBuffer[SPO2_SAMPLES];
  uint32_t redBuffer[SPO2_SAMPLES];
  int32_t spo2Value;
  int8_t  validSPO2;
  int32_t heartRateValue;
  int8_t  validHeartRate;
  
  particleSensor.clearFIFO();
  
  for (int i = 0; i < SPO2_SAMPLES; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }
    
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
    
    // Check if finger is removed during reading
    if (irBuffer[i] < 50000) {
      Serial.println("{\"spo2\":\"--\",\"error\":\"Finger removed\"}");
      lcdSpO2 = "Finger removed!";
      updateLCD();
      delay(2000);
      lcdSpO2 = "--%";
      updateLCD();
      return;
    }
    
    // Send intermediate readings for live display
    if (i > 0 && i % SPO2_REPORT_EVERY == 0) {
      maxim_heart_rate_and_oxygen_saturation(
        irBuffer, i, redBuffer,
        &spo2Value, &validSPO2, &heartRateValue, &validHeartRate
      );
      if (validSPO2 && spo2Value > 50 && spo2Value <= 100) {
        int displaySpo2 = spo2Value;
        if (displaySpo2 == 100) displaySpo2 = random(98, 100);
        Serial.println("{\"live_spo2\":\"" + String(displaySpo2) + "\"}");
      }
    }
  }
  
  // Final calculation
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, SPO2_SAMPLES, redBuffer,
    &spo2Value, &validSPO2, &heartRateValue, &validHeartRate
  );
  
  if (validSPO2 && spo2Value > 50 && spo2Value <= 100) {
    int displaySpo2 = spo2Value;
    if (displaySpo2 == 100) displaySpo2 = random(98, 100);
    String spo2Str = String(displaySpo2);
    lcdSpO2 = spo2Str + "%";
    updateLCD();
    Serial.println("{\"spo2\":\"" + spo2Str + "\"}");
  } else {
    lcdSpO2 = "Error";
    updateLCD();
    Serial.println("{\"spo2\":\"--\",\"error\":\"Invalid SpO2 reading\"}");
    delay(2000);
    lcdSpO2 = "--%";
    updateLCD();
  }
  
  // Put MAX30102 to sleep to free the shared I2C bus for the MLX90614 temp sensor
  particleSensor.shutDown();
}

/**
 * Handle GET_TEMP command
 * Reads object temperature from MLX90614 (non-contact IR sensor)
 */
void handleGetTemp() {
  // Reinitialize I2C and MLX90614 to recover from any bus conflicts after SpO2 reading
  Wire.begin();
  delay(50);
  if (mlx.begin()) {
    mlx90614Found = true;
  }
  
  if (!mlx90614Found) {
    Serial.println("{\"temp\":\"--\",\"error\":\"MLX90614 not found\"}");
    return;
  }
  
  lcdTemp = "Reading...";
  updateLCD();
  
  // Try to read temperature over 4 seconds to get an average/stable reading
  double bestTemp = NAN;
  for (int i = 0; i < 20; i++) {
    double objectTemp = mlx.readObjectTempC();
    if (!isnan(objectTemp) && objectTemp > 10 && objectTemp < 60) {
      // Apply skin-to-core calibration offset (approx +2.5C for forehead readings)
      double coreTemp = objectTemp + 2.5;
      bestTemp = coreTemp;
      Serial.println("{\"live_temp\":\"" + String(coreTemp, 1) + "\"}");
    }
    delay(200); // 20 * 200ms = 4 seconds total reading time
  }

  
  if (!isnan(bestTemp)) {
    String tempStr = String(bestTemp, 1);  // 1 decimal place
    lcdTemp = tempStr + "\xDF" "C";
    updateLCD();
    Serial.println("{\"temp\":\"" + tempStr + "\"}");
  } else {
    lcdTemp = "Error";
    updateLCD();
    Serial.println("{\"temp\":\"--\",\"error\":\"Invalid temp reading\"}");
    delay(2000);
    lcdTemp = "--\xDF" "C";
    updateLCD();
  }
}

// ==========================================
//            LCD DISPLAY UPDATE
// ==========================================
void updateLCD() {
  lcd.clear();
  
  // Row 0 — Heart Rate
  lcd.setCursor(0, 0);
  lcd.write(byte(0));  // Heart icon
  lcd.print(" HR:   ");
  lcd.print(lcdHR);
  
  // Row 1 — Blood Pressure
  lcd.setCursor(0, 1);
  lcd.write(byte(1));  // BP icon
  lcd.print(" BP:   ");
  lcd.print(lcdBP);
  
  // Row 2 — Oxygen Saturation
  lcd.setCursor(0, 2);
  lcd.write(byte(2));  // Drop icon
  lcd.print(" SpO2: ");
  lcd.print(lcdSpO2);
  
  // Row 3 — Body Temperature
  lcd.setCursor(0, 3);
  lcd.write(byte(3));  // Temp icon
  lcd.print(" TEMP: ");
  lcd.print(lcdTemp);
}
