// Amphib water handling. Other airplanes never reach this; they ditch in the flight model.
// Distances are informational: a light amphib's water run is about 1.6–2.2x its land roll
// until the hull is on the step (nose up, power on, gear up). Sandbox keeps going unless it is a real smash.

export function applyAmphibWater(flight, vert, gs) {
  const s = flight.spec;
  const noseUp = flight.euler.x < -0.06;
  const powered = flight.throttle > 0.5;
  const gearUp = !s.hasGear || !flight.gearDown;
  const onStep = gearUp && powered && noseUp && gs > 11 && gs < 34 && vert < 2.2;
  flight.onStep = onStep;

  // Fast or flat attitude: the hull skips instead of sticking.
  if (gs > 27 && (vert > 1.1 || flight.euler.x > 0.02)) {
    flight.onStep = false;
    flight.onGround = false;
    flight.velocity.y = Math.min(5.5, 1.3 + vert * 0.28);
    flight.velocity.x *= 0.84;
    flight.velocity.z *= 0.84;
    flight.position.y += 0.85;
    return {
      event: { event: 'rough', reason: 'skipped — too fast or not on the step', vert, gs },
      wfric: 1,
      pitchDamp: 1,
      rollDamp: 1
    };
  }

  // On the step, drag drops and the takeoff run shortens. In the plow, it stays long.
  const wfric = onStep ? 0.988 : 0.78;
  return {
    event: null,
    wfric,
    pitchDamp: onStep ? 0.9 : 0.76,
    rollDamp: onStep ? 0.94 : 0.86
  };
}
