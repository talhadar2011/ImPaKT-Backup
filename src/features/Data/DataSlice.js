import { createSlice,createAsyncThunk } from "@reduxjs/toolkit";
const initialState = {
    Nodes:[],
    Edges:[],
    RootNode:[],
    ExpandingNodes:[],
    ExpandingEdges:[],
    ExpandedNodeids:[],
    Check:null,
    FilterNodes:[],
    FilterEdges:[],
    NodesDepth:0,
    status: 'idle',
  };

export const getData=createAsyncThunk(
    'Data/getData',
    async()=>{
        return fetch('http://localhost:3000/Data')
        .then(
            (res)=> res.json()
            )
    }
)

export const DataSclice=createSlice({
    name:'Data',
    initialState,
    extraReducers:{
        [getData.pending]:(state,action)=>{
            state.status='loading'
        },
        [getData.fulfilled]:(state,{payload})=>{
            state.Nodes=payload.Shape
            state.Edges=payload.RelationShip
            let Root_Id=[]
            let Root_Nodes=[]
            var test=[]
            // for (let i = 0; i < state.Edges.length; i++) {
            //     for (let j = 0; j < state.Edges.length; j++) {
            //         if(state.Edges[i].source[0]!==state.Edges.target[0])
            //         {
            //             Root=[...Root,state.Edges[i].source[0]]
            //         }

            //     }
            // }
            state.Edges.map((Edge)=>{
                test=state.Edges.some(Ed=>Ed.target[0]==Edge.source[0])
                if(test===false)
                {
                    Root_Id=[...Root_Id,Edge.source[0]]
                }
            })
            Root_Id=[...new Set(Root_Id)];
            Root_Id.map((node)=>{
                Root_Nodes=[...Root_Nodes,...state.Nodes.filter(fnode=>fnode.id===node)]
            })
            // state.Nodes.map((Node)=>{
            //     if(Node.id==Root)
            //     {
            //     Expanding_Nodes=Node
            //     }

            // })
            state.RootNode=Root_Nodes
            state.status='Data added'
        },
        [getData.rejected]:(state,action)=>{
            state.status='Error in data fetching'
        },

    },
    reducers:{

        setupdatingNodes: (state,{payload}) => {
          //  console.log(payload,'setNode Payload')
            state.Nodes=payload


          },
          setNodesDepth: (state,{payload}) => {
            //  console.log(payload,'setNode Payload')
              state.NodesDepth=payload
  
  
            },
        setupdatingEdges:(state,{payload})=>{
           // console.log(payload,'setEdgesPayload')
            state.Edges=payload


        },
        setFilterNodes:(state,{payload})=>{
            state.FilterNodes=payload

        },
        setFilterEdges:(state,{payload})=>{
            state.FilterEdges=payload

        },
        setExpandingNodes: (state,{payload}) => {
            //  console.log(payload,'setNode Payload')
              state.ExpandingNodes=payload


            },
        setExpandingEdges:(state,{payload})=>{
            // console.log(payload,'setEdgesPayload')
            state.ExpandingEdges=payload


        },
        setExpandedNodeids: (state,{payload}) => {
            //  console.log(payload,'setNode Payload')
              state.ExpandedNodeids=payload


            },

        setCheck: (state,{payload}) => {
            //  console.log(payload,'setNode Payload')
                state.Check=payload


            },



    }
})
export const { setupdatingNodes,setNodesDepth,setupdatingEdges,setFilterNodes,setFilterEdges,setExpandingNodes,setExpandingEdges,setExpandedNodeids,setCheck} = DataSclice.actions

export default DataSclice.reducer