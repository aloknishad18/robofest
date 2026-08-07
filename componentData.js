export const componentData = {
    wheelAssembly_FL: {
        id: "01",
        name: "Wheel Assembly FL",
        category: "MECHANICAL",
        description: "Front Left Drive Wheel with integrated geared motor and suspension linkages for uneven terrain traversal.",
        materials: "Rubber, Aluminum Alloy, Stainless Steel",
        specs: {
            "Diameter": "200mm",
            "Traction": "Off-road Knobby",
            "Motor Type": "DC Geared",
            "Torque": "15 Nm",
            "Weight": "1.2 kg"
        },
        subComponents: [
            {
                id: "01-A",
                name: "Rubber Tyre",
                meshNames: ["Wheel_0"],
                specs: { "Material": "High-grip Rubber", "Tread": "Knobby" }
            },
            {
                id: "01-B",
                name: "Drive Hub",
                meshNames: ["Wheel_0_Hub"], 
                specs: { "Material": "Alloy", "Mount": "Hex" }
            },
            {
                id: "01-C",
                name: "DC Geared Motor",
                meshNames: ["Motor_0"], 
                specs: { "Voltage": "24V", "Torque": "15 Nm" }
            }
        ]
    },
    pumpAssembly: {
        id: "02",
        name: "Spray System",
        category: "MECHANICAL",
        description: "Precision fluid delivery system consisting of high-pressure pumps and adjustable brass nozzles.",
        materials: "Brass, Stainless Steel, Delrin",
        specs: {
            "Max Pressure": "120 PSI",
            "Flow Rate": "0.5 L/min",
            "Spray Angle": "110°",
            "Nozzle Type": "Flat Fan",
            "Voltage": "12V"
        },
        subComponents: [
            {
                id: "02-A",
                name: "Brass Nozzle",
                meshNames: ["Nozzle", "Spray", "Valve"],
                specs: { "Material": "Brass", "Angle": "110°" }
            },
            {
                id: "02-B",
                name: "Main Pump",
                meshNames: ["Pump"],
                specs: { "Flow Rate": "0.5 L/min", "Type": "Diaphragm" }
            }
        ]
    },
    upperCameraAssembly: {
        id: "03",
        name: "Upper RGB Camera",
        category: "ELECTRONICS",
        description: "High-resolution primary computer vision sensor for crop health analysis and weed detection.",
        materials: "Polycarbonate, Optical Glass, Aluminum",
        specs: {
            "Resolution": "4K / 3840x2160",
            "Framerate": "60 fps",
            "FOV": "120° Wide Angle",
            "Interface": "MIPI CSI-2",
            "Sensor": "Sony IMX477"
        },
        subComponents: [
            {
                id: "03-A",
                name: "Optical Lens",
                meshNames: ["Camera_Top", "Lens"],
                specs: { "FOV": "120°", "Type": "Glass" }
            },
            {
                id: "03-B",
                name: "Sensor Housing",
                meshNames: ["Cam_Housing"],
                specs: { "Material": "Aluminum", "IP Rating": "IP67" }
            }
        ]
    },
    chassisAssembly: {
        id: "04",
        name: "Main Chassis",
        category: "MECHANICAL",
        description: "The primary structural frame housing all sensitive electronics and serving as the rigid base for the mast and drivetrain.",
        materials: "Carbon Fiber, Anodized Aluminum",
        specs: {
            "Dimensions": "600 x 450 x 200 mm",
            "Load Capacity": "30 kg",
            "IP Rating": "IP65",
            "Mounting": "Standard T-Slot",
            "Weight": "4.5 kg"
        },
        subComponents: [
            {
                id: "04-A",
                name: "Top Plate",
                meshNames: ["Chassis_Top", "Top_Panel"],
                specs: { "Material": "Carbon Fiber" }
            },
            {
                id: "04-B",
                name: "Side Rails",
                meshNames: ["Chassis_Side", "Frame"],
                specs: { "Material": "Aluminum", "Thickness": "4mm" }
            }
        ]
    },
    batteryAssembly: {
        id: "05",
        name: "Battery Pack",
        category: "ELECTRONICS",
        description: "High-capacity Lithium-Ion battery pack providing up to 6 hours of continuous autonomous operation.",
        materials: "Lithium-Ion, ABS Plastic, Copper",
        specs: {
            "Voltage": "24V Nominal",
            "Capacity": "10 Ah",
            "Chemistry": "LiFePO4",
            "Charge Time": "2 Hours (Fast)",
            "Cycle Life": "2000 Cycles"
        },
        subComponents: [
            {
                id: "05-A",
                name: "Cell Array",
                meshNames: ["Battery", "Cells", "Pack"],
                specs: { "Type": "18650 Array", "Capacity": "10 Ah" }
            },
            {
                id: "05-B",
                name: "BMS Board",
                meshNames: ["BMS", "Circuit"],
                specs: { "Protection": "Overcharge, Temp", "Max Draw": "30A" }
            }
        ]
    }
};
