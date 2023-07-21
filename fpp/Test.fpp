module Components {

    active component Test {

        async input port testIn: Fw.Buffer

        sync input port testInSync: Fw.Buffer
        
        output port testOut: Fw.Buffer

    }
}