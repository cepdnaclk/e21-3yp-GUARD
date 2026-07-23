#ifndef ACTUATORS_H
#define ACTUATORS_H

#include <Arduino.h>

void initActuators();
void applyPumpControl();
void setPumpStates(bool fillOn, bool drainOn, const String &source);
void handleServo();
void updateLED();

#endif // ACTUATORS_H
