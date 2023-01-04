const xmlns = 'xmlns="http://www.w3.org/2000/svg"';

function buildGatewayIcons({ color = '#000', svg = false } = {}) {

    const svgIcons = {
        exclusive_blank: null,
        exclusive: `<svg ${xmlns} viewBox="12 12 26 26"><path fill="${color}" stroke="${color}" d="M18.25 17.063L23.5 25.5l-5.25 8.438h4l3.25-5.25 3.25 5.25h3.906L27.438 25.5l5.218-8.438H28.75l-3.25 5.25-3.25-5.25h-4z"/></svg>`,
        inclusive: `<svg ${xmlns} viewBox="12 12 26 26"><circle cx="25" cy="25" r="9.429" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        parallel: `<svg ${xmlns} viewBox="12 12 26 26"><path fill="${color}" stroke="${color}" stroke-width="1.4" d="M16.388 21.821v5.625h5.86v6.328h5.624v-6.328H34.2v-5.625h-6.328v-5.86h-5.625v5.86z"/></svg>`,
        event: `<svg ${xmlns} viewBox="12 12 26 26"><circle stroke-width="1.4" cx="25" cy="25" r="12.121" fill="none" stroke="${color}"/><circle stroke-width="1.4" cx="25" cy="25" r="10.121" fill="none" stroke="${color}"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" d="M29.828 31.845h-9.069l-2.801-8.625 7.337-5.33 7.335 5.33-2.802 8.625z"/></svg>`,
        exclusive_event: `<svg ${xmlns} viewBox="12 12 26 26"><circle stroke-width="1.4" cx="25" cy="25" r="12.121" fill="none" stroke="${color}"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" d="M29.828 31.845h-9.069l-2.801-8.625 7.337-5.33 7.335 5.33-2.802 8.625z"/></svg>`,
        parallel_event: `<svg ${xmlns} viewBox="12 12 26 26"><circle stroke-width="1.4" cx="25" cy="25" r="12.121" fill="none" stroke="${color}"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" d="M16.388 21.821v5.625h5.86v6.328h5.624v-6.328H34.2v-5.625h-6.328v-5.86h-5.625v5.86z"/></svg>`,
        complex: `<svg ${xmlns} viewBox="13 13 25 25"><path fill="none" stroke="${color}" stroke-width="4" d="M16.25 25.5h19m-9.75-9.25v19m-6.644-2.96L32.29 18.857m-13.435.353L32.29 32.644"/></svg>`,
    };

    if (svg) {
        return svgIcons;
    }

    const icons = {};
    Object.keys(svgIcons).forEach(iconName => {
        icons[iconName] = `data:image/svg+xml,${encodeURIComponent(svgIcons[iconName])}`;
    });
    return icons;
}

function buildActivityMarkers({ color = '#000', svg = false } = {}) {

    const svgIcons = {
        'none': null,
        'parallel': `<svg ${xmlns} viewBox="-3 -3 16 16"><path fill="none" stroke="${color}" stroke-width="2" d="M0 0v10M3 0v10M6 0v10"/></svg>`,
        'sequential': `<svg ${xmlns} viewBox="-3 -3 16 16"><path fill="none" stroke="${color}" stroke-width="2" d="M0 2h10M0  5h10M0 8h10"/></svg>`,
        'sub-process': `<svg ${xmlns} viewBox="-2 -2 14 14"><path fill="none" stroke="${color}" stroke-width="1" d="M0 0h10v10H0zm5 2v6M2 5h6"/></svg>`,
        'compensation': `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 13.438v13.124L12.437 20 19 13.437m6.563 0v13.126L19 20l6.563-6.563z"/></svg>`,
        'ad-hoc': `<svg ${xmlns} viewBox="0 0 2000 2000"><path fill="${color}" d="M300 1039.87c58.332-138.228 134.894-282.23 266.546-360.085c97.784-58.392 218.701-22.42 308.428 34.819c138.188 85.207 246.292 211.842 382.606 299.507c82.335 48.265 184.733 8.718 244.748-58.056c72.401-84.446 155.215-164.023 197.672-269.981v330.038c-61.331 121.67-140.231 248.152-266.392 307.169c-103.228 44.44-223.148 17.789-312.524-46.586c-131.02-87.979-227.486-223.69-369.854-294.78c-69.172-36.004-157.377-27.545-215.331 26.623C431.412 1101.042 371.534 1231.858 300 1350v-310.13z"/></svg>`,
        'loop': `<svg ${xmlns} viewBox="0 0 2000 2000"><path fill="${color}" d="M1057.07 410.836C805.11 407.3 563.447 583.065 491.134 824.983c-55.584 173.977-23.105 373.061 85.522 520.027l-269.086-52.09l-22.804 117.814l483.865 93.664l93.687-479.986l-117.779-22.988l-56.861 291.316c-138.733-165.6-136.73-427.773 4.367-591.379c137.417-171.716 399.203-221.007 590.733-114c183.232 94.568 284.888 318.597 234.896 518.746c-44.77 208.91-247.404 367.34-460.604 363.053c-55.485-3.935-83.374 76.196-37.436 107.561c40.104 24.986 90.846 7.364 134.808 4.475c248.181-37.748 457.52-249.452 489.52-498.91c36.994-238.025-91.384-488.935-304.803-600.241c-86.168-46.769-184.068-71.364-282.089-71.21z"/></svg>`
    };

    if (svg) {
        return svgIcons;
    }

    const icons = {};
    Object.keys(svgIcons).forEach(iconName => {
        icons[iconName] = `data:image/svg+xml,${encodeURIComponent(svgIcons[iconName])}`;
    });
    return icons;
}


function buildActivityIcons({ color = '#000', svg = false } = {}) {

    const svgIcons = {
        'none': null,
        'business-rule': `<svg ${xmlns} viewBox="5 5 25 20"><path fill="${color}" stroke="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="m 8,8 0,4 20,0 0,-4 z"/><path stroke="${color}" fill="none" d=" m 8,8 0,12 20,0 0,-12 zm 0,8 l 20,0 m -13,-4 l 0,8"/></svg>`,
        'manual': `<svg ${xmlns} viewBox="0 0 2000 2000"><path d="M919.379 382.988c-22.3.007-42.953 8.258-60.567 19.616l-.029.017-.027.02c-94.694 61.32-418.867 286.29-490.127 335.2l-.002.003h-.002c-64.371 44.196-107.733 110.904-132.662 189.935l-.004.016-.004.014c-25.952 82.515-22.622 172.403-22.371 247.685l.002.02v.02c.255 56.685 1.606 106.154 16.309 166.148l.003.015c21.373 87.802 62.768 151.336 121.23 190.285 58.46 38.948 130.615 52.768 211.575 53.018 292.284 1.097 584.741 1.49 877.182 0h.05c32.21-.211 62.96-13.752 82.135-37.678 19.174-23.923 27.017-54.865 27.43-88.81.29-22.768-2.91-44.287-10.307-63.512h32.375c31.532 0 60.434-8.984 81.153-27.916 20.711-18.926 31.304-44.62 36.808-71.68v-.007c7.683-37.64 4.055-74.807-10.916-105.997 32.946-2.661 62.034-15.102 80.74-37.906 21.024-25.627 27.148-58.205 27.256-92.72.115-36.034-8.629-70.421-28.812-97.766s-53.772-45.956-91.567-46.01H1666.21c-13.76-.011-26.16.008-41.781 0 7.516-18.744 10.82-39.826 10.752-62.006v-.113c-.228-35.772-9.251-69.954-29.535-97.127-20.284-27.173-53.809-45.753-91.586-45.754-224.42-.885-446.252 2.157-634.903 1.203 9.83-9.885 19.378-19.525 29.871-29.96 32.482-32.304 63.7-62.743 79.827-83.612 38.555-49.623 44.307-116.852 11.85-166.305-17.114-26.143-42.208-43.832-69.151-47.513a89.543 89.543 0 00-10.012-.8v.003a90.145 90.145 0 00-2.162-.026zm.547 70.028a17.31 17.31 0 012.148.152c5.305.725 10.986 2.62 20.07 16.506l.018.025.016.026c12.691 19.326 12.131 58.305-8.623 84.992l-.035.045-.036.045c-7.546 9.77-41.454 44.616-73.818 76.802-32.364 32.187-63.134 61.896-78.357 80.442-14.557 17.734-9.216 32.647-5.268 41.982 3.948 9.335 8.465 20.237 28.598 25.02 6.028 1.432 6.36 1.02 8.289 1.152 1.929.133 3.923.224 6.267.309 4.689.169 10.688.297 18.094.406 226.465 1.38 450.423-1.24 676.709-.92h.063c17.211 0 26.557 5.657 35.492 17.627 8.929 11.962 15.468 31.813 15.629 55.652.066 24.73-5.857 39.82-13.057 48.133-7.2 8.313-16.845 13.52-37.475 13.588H1030v70h484.791c66.478.006 101.54-.042 151.363 0 17.308.03 26.53 5.662 35.324 17.578 8.8 11.922 15.21 31.827 15.133 55.975v.002c-.08 25.822-5.346 41.196-11.375 48.545-6.029 7.349-14.638 12.732-39.482 12.902-8.43.058-68.808.014-93.863.043-.397-.005-.786-.042-1.184-.043-180.227-.85-360.455-.002-540.682-.002H1030l-.025 70h.025c.043 0 382.517.239 541.33.047 19.7.279 31.511 8.21 40.934 23.601 9.563 15.621 14.323 40.11 8.68 67.756v.028c-3.737 18.38-9.413 28.473-15.436 33.976-6.023 5.504-14.335 9.592-33.934 9.592-180.523-.086-361.044-.452-541.568 0h-.092l.092 70h409.414c14.707.096 21.247 4.008 27.96 12.977 6.715 8.968 12.44 25.642 12.132 49.652v.025c-.284 23.412-5.952 38.272-12.057 45.889-6.105 7.617-12.405 11.357-27.973 11.459-292.123 1.488-584.356 1.097-876.51 0h-.025c-73.053-.223-130.456-12.932-173-41.275-42.55-28.344-73.607-72.869-92.039-148.598l-.008-.03-.005-.029c-12.87-52.492-14.06-94.01-14.311-149.81v-.041c-.256-76.57-1.724-160.05 19.146-226.408 21.392-67.802 55.988-119.253 105.512-153.256l.004-.002c72.125-49.505 398.23-275.66 488.5-334.12l.004-.001c8.476-5.465 15.5-7.79 20.719-8.303.87-.086 1.689-.122 2.457-.113z" fill="${color}" /></svg>`,
        'receive': `<svg ${xmlns} viewBox="10 10 20 20"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M12.5 15.313v9.374h15v-9.375zm0 0l7.5 5.624 7.5-5.625"/></svg>`,
        'script': `<svg ${xmlns} viewBox="0 0 2000 2000"><path d="M759.41 378l-8.262 4.904-2.699 1.604C631.658 453.72 551.284 517.185 498.23 579.16c-53.13 62.06-78.817 124.548-79.547 184.787-1.454 119.88 86.972 209.719 165.425 290.067 78.394 80.286 148.323 156.002 154.905 218.664 3.354 31.938-4.195 64.019-39.02 107.943-34.678 43.74-97.616 96.128-198.24 154.785L353.193 1622h916.854l10.85-6.313.011-.01c106.636-62.16 178.477-119.59 224.254-177.33 45.914-57.91 64.594-118.499 58.62-175.378-11.838-112.702-103.646-194.827-180.829-273.873-77.243-79.108-139.852-153.721-139-224.024.43-35.49 14.072-75.084 57.219-125.484 43.073-50.314 115.696-109.181 227.031-175.158v-.002L1674.045 378H759.41zm25.842 92.918h564.643c-49.73 37.078-89.049 72.898-119.307 108.242-53.13 62.06-78.817 124.548-79.547 184.787-1.453 119.882 86.977 209.72 165.43 290.067 78.393 80.286 148.316 156 154.898 218.664 3.355 31.938-4.193 64.019-39.017 107.943-33.397 42.123-93.456 92.386-187.79 148.461h-566.09c39.27-30.627 70.469-60.635 94.33-90.732 45.914-57.911 64.594-118.5 58.62-175.38-11.838-112.701-103.645-194.826-180.828-273.872-77.243-79.108-139.85-153.721-138.998-224.024.43-35.49 14.07-75.084 57.216-125.484 41.627-48.624 111.275-105.346 216.44-168.672zM653.13 629.393v42.92h441.398v-42.92H653.131zm-16.402 231.175v42.918h456.384v-42.918H636.73zm206.794 231.17v42.918h441.989v-42.918H843.523zm63.198 231.174v42.918h457.986v-42.918H906.721z" fill="${color}"/></svg>`,
        'send': `<svg ${xmlns} viewBox="10 10 20 20"><path fill="${color}" d="M12.5 14.344l7.5 5.625 7.5-5.625zm0 .937v9.375h15v-9.375L20 20.906z"/></svg>`,
        'service': `<svg ${xmlns} viewBox="0 0 2000 2000"><path d="M825.746 438.174c-.046 36.998.01 73.998.106 110.996-31.554 8.927-60.387 21.384-87.616 36.644l-79.582-78.625-148.806 149.668 79.576 78.612a393.526 393.526 0 00-35.752 87.242l-112.725.205v210.79l113.903-.411c10.416 41.298 33.084 78.425 55.662 111.623V963.094l-99.565.357V892.79l99.069-.18 5.56-28.172c8.11-41.084 24.17-80.249 47.244-115.292l15.785-23.973-69.603-68.762 50.094-50.385 69.73 68.893 23.73-15.836c36.264-23.926 75.929-39.963 115.481-48.316l27.96-5.805-.25-96.785h71.966l-.557 96.281h188.834c-17.713-21.144-91.12-48.658-118.508-56.324l.635-109.957c-78.4-.002-139.865.004-212.37-.002zm199.158 201.658l.287 110.992c-31.554 8.927-60.387 21.383-87.617 36.645l-79.584-78.625-148.806 149.668 79.578 78.611a393.515 393.515 0 00-35.754 87.244l-112.723.203v210.79l113.9-.409c8.966 31.257 21.395 59.8 36.626 86.746l-81.495 81.176 150.465 147.879 81.201-80.824c27.815 15.444 57.38 27.436 88.034 35.781l.052 114.713c72.392.634 149.467.307 211.336.3v-116.07c31.578-8.904 60.501-21.45 87.737-36.705l81.134 79.996 148.905-149.48-81.305-80.123a394.444 394.444 0 0035.799-87.399l110.379-.681v-210.586l-111.618.68c-8.972-31.287-21.22-59.637-36.654-86.762l77.121-77.319-150.38-148.13-77.022 77.285a398.637 398.637 0 00-87.68-35.639l.633-109.957h-212.549zm70.18 70h71.967l-.555 96.283 28.426 5.578c41.272 8.1 80.83 24.14 116.015 47.073l23.825 15.529 67.216-67.445 50.618 49.86-67.31 67.483 16.194 23.907c23.765 35.872 39.529 74.65 48.428 114.58l5.856 28.011 97.28-.591v70.59l-96.737.595-5.557 28.012a324.606 324.606 0 01-47.299 115.398l-15.803 24.006 71.258 70.223-50.086 50.28-71.265-70.266-23.69 15.738c-36.275 23.706-75.624 40.123-115.324 48.21l-28.144 5.622v102.215c-19.241.046-40.231.016-71.37-.028l-.045-101.449-28.271-5.521c-41.33-8.071-80.823-24.038-115.947-47.067l-23.754-15.574-71.541 71.21-50.625-49.757 71.64-71.361-16.347-24.004c-23.787-35.794-39.523-74.612-48.438-114.496l-5.85-27.926-99.564.355v-70.66l99.069-.181 5.56-28.168c8.11-41.085 24.17-80.252 47.244-115.295l15.785-23.975-69.605-68.762 50.094-50.384 69.732 68.892 23.73-15.834c36.31-23.77 74.841-39.541 115.481-48.314l27.96-5.805-.251-96.787zm37.166 257.203c-86.647 0-157.639 70.994-157.639 157.64 0 86.648 70.992 157.638 157.639 157.638s157.639-70.99 157.639-157.637-70.992-157.64-157.639-157.64zm0 70c48.816 0 87.639 38.825 87.639 87.64 0 48.817-38.823 87.638-87.639 87.638-48.816 0-87.637-38.821-87.637-87.637s38.82-87.64 87.637-87.64z" fill="${color}"/></svg>`,
        'user': `<svg ${xmlns} viewBox="0 0 2000 2000"><path d="M991.75 365c-177.277 0-304.097 136.28-304.453 291.514v.088c.011 46.944 12.714 96.49 32.56 141.177 14.33 32.267 32.147 61.932 53.858 85.696-129.03 44.143-280.193 116.795-356.598 260.054L413 1151.25V1615h1157.5v-463.75l-4.117-7.72c-75.306-141.2-223.199-213.75-350.98-258.077 62.379-63.433 80.78-145.306 80.8-228.851v-.088C1295.847 501.28 1169.027 365 991.75 365zM870.709 530.299c8.194.02 17.191.294 27.11.879 79.022 4.657 105.618 18.882 126.062 32.373 20.443 13.49 34.855 26.333 88.883 27.908h.034c42.101-1.575 62.349-9.081 76.869-17.584 5.884-3.445 10.824-7.027 15.887-10.447 13.38 28.682 20.567 60.389 20.648 93.203-.028 93.44-16.092 158.876-101.768 212.424l8.381 63.17c17.833 5.415 36.266 11.357 54.975 17.873 2.613 10.9 5.632 25.196 7.662 40.394 2.127 15.923 2.964 32.489 1.652 44.928-1.311 12.439-5.173 19.154-5.851 19.832-43.547 43.547-120.847 68.943-199.252 68.943-78.406 0-155.705-25.396-199.252-68.943-.678-.678-4.54-7.393-5.852-19.832-1.311-12.439-.475-29.005 1.653-44.928 2.041-15.282 5.084-29.662 7.707-40.584 18.522-6.44 36.77-12.32 54.43-17.683l4.995-67.688c-4.068-5.217-8.213-8.673-13.16-12.385-19.121-14.345-42.31-45.903-58.69-82.785-16.373-36.868-26.517-79.01-26.532-112.744.101-40.444 10.985-79.211 30.976-112.697 3.577-1.332 7.349-2.739 11.588-4.133 14.908-4.903 35.337-9.583 70.846-9.494zM719.361 979.855c-.063.46-.133.907-.195 1.368-2.587 19.363-4.107 40.44-1.883 61.537 2.224 21.096 7.79 43.81 25.969 61.988 62.048 62.048 155.95 89.447 248.748 89.447 92.797 0 186.7-27.4 248.748-89.447 18.178-18.178 23.745-40.892 25.969-61.988 2.224-21.097.704-42.174-1.883-61.537-.051-.382-.11-.753-.162-1.133 94.334 41.369 185.515 100.615 235.828 189.074V1545H1333v-265h-70v265H719v-265h-70v265H483v-375.836c50.408-88.626 141.838-147.93 236.361-189.309z" fill="${color}" fill-rule="evenodd"/></svg>`
    };

    if (svg) {
        return svgIcons;
    }

    const icons = {};
    Object.keys(svgIcons).forEach(iconName => {
        icons[iconName] = `data:image/svg+xml,${encodeURIComponent(svgIcons[iconName])}`;
    });
    return icons;
}

function buildNewIcons({ color = '#000', svg = false } = {}) {

    const svgIcons = {
        none: null,
        message1: `<svg ${xmlns} viewBox="10 10 20 20"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M12.5 15.313v9.374h15v-9.375zm0 0l7.5 5.624 7.5-5.625"/></svg>`,
        message2: `<svg ${xmlns} viewBox="10 10 20 20"><path fill="${color}" d="M12.5 14.344l7.5 5.625 7.5-5.625zm0 .937v9.375h15v-9.375L20 20.906z"/></svg>`,
        timer1: `<svg ${xmlns} viewBox="8 8 24 24"><g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><circle cx="20" cy="20" r="10"/><path d="M20 10v3m5-2l-1.5 3m5.5 1l-3 1.5m4 3.5h-3m2 5l-3-1.5M25 29l-1.5-3M20 30v-3m-5 2l1.5-3M11 25l3-1.5M10 20h3m-2-5l3 1.5m1-5.5l1.5 3m5.5-1l-2 7h4"/></g></svg>`,
        conditional1: `<svg ${xmlns} viewBox="6 6 28 28"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.563 11.563h16.874v16.874H11.563V11.563m2.813 2.813h11.25m-11.25 3.75h11.25m-11.25 3.75h11.25m-11.25 3.75h11.25z"/></svg>`,
        link1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.406 18.125h8.438v-2.813L27.53 20l-4.687 4.688v-2.813h-9.375v-3.75"/></svg>`,
        link2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.406 18.125h8.438v-2.813L27.53 20l-4.687 4.688v-2.813h-9.375v-3.75"/></svg>`,
        signal1: `<svg ${xmlns}  viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.17 24.851h13.706l-6.853-11.879-6.854 11.88z"/></svg>`,
        signal2: `<svg ${xmlns}  viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.17 24.851h13.706l-6.853-11.879-6.854 11.88z"/></svg>`,
        error1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M26.4 15.455l-3.238 12.58L17.7 18.37 13.76 23.8l3.478-12.412 5.576 8.72 3.586-4.652z"/></svg>`,
        error2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M26.4 15.455l-3.238 12.58L17.7 18.37 13.76 23.8l3.478-12.412 5.576 8.72 3.586-4.652z"/></svg>`,
        escalation1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13.219l5.625 14.062L20 20.953l-5.625 6.328z"/></svg>`,
        escalation2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13.219l5.625 14.062L20 20.953l-5.625 6.328z"/></svg>`,
        termination1: `<svg ${xmlns} viewBox="8 8 24 24"><circle cx="20" cy="20" r="10.5" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>`,
        termination2: `<svg ${xmlns} viewBox="8 8 24 24"><circle cx="20" cy="20" r="10.5" fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>`,
        compensation1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 13.438v13.124L12.437 20 19 13.437m6.563 0v13.126L19 20l6.563-6.563z"/></svg>`,
        compensation2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 13.438v13.124L12.437 20 19 13.437m6.563 0v13.126L19 20l6.563-6.563z"/></svg>`,
        cancel1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.284 14.274l2.867-2.868 5.735 5.735 5.735-5.735 2.868 2.868-5.735 5.735 5.735 5.735-2.868 2.867-5.735-5.735-5.735 5.735-2.867-2.867 5.735-5.735-5.735-5.735z"/></svg>`,
        cancel2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.284 14.274l2.867-2.868 5.735 5.735 5.735-5.735 2.868 2.868-5.735 5.735 5.735 5.735-2.868 2.867-5.735-5.735-5.735 5.735-2.867-2.867 5.735-5.735-5.735-5.735z"/></svg>`,
        multiple1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M24.52 26.39h-9.443l-2.918-8.982 7.64-5.55 7.64 5.551-2.919 8.98z"/></svg>`,
        multiple2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M24.52 26.39h-9.443l-2.918-8.982 7.64-5.55 7.64 5.551-2.919 8.98z"/></svg>`,
        parallel1: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.344 17.203v5.625h5.86v6.328h5.624v-6.328h6.328v-5.625h-6.328v-5.86h-5.625v5.86z"/></svg>`,
        parallel2: `<svg ${xmlns} viewBox="8 8 24 24"><path fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.344 17.203v5.625h5.86v6.328h5.624v-6.328h6.328v-5.625h-6.328v-5.86h-5.625v5.86z"/></svg>`
    };

    if (svg) {
        return svgIcons;
    }

    const icons = {};
    Object.keys(svgIcons).forEach(iconName => {
        icons[iconName] = `data:image/svg+xml,${encodeURIComponent(svgIcons[iconName])}`;
    });
    return icons;
}

export const eventIcons = buildNewIcons({ color: '${color}', svg: true });
export const gatewayIcons = buildGatewayIcons({ color: '${color}', svg: true });
export const activityMarkers = buildActivityMarkers({ color: '${color}', svg: true });
export const activityIcons = buildActivityIcons({ color: '${color}', svg: true });
